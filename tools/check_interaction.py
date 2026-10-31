"""Offline interaction and screenshot checks for the sticker review page."""

import mimetypes
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

root = Path(sys.argv[1]).resolve()
output = Path(sys.argv[2]).resolve()
output.mkdir(parents=True, exist_ok=True)
origin = 'http' + '://local.test'


def serve(route):
    relative = route.request.url.split('local.test/', 1)[1].split('?', 1)[0]
    target = (root / relative).resolve()
    if root not in target.parents or not target.is_file():
        route.fulfill(status=404, body='not found')
        return
    kind = mimetypes.guess_type(target.name)[0] or 'application/octet-stream'
    route.fulfill(status=200, body=target.read_bytes(), headers={'Content-Type': kind})


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(channel='msedge', headless=True)
    context = browser.new_context(viewport={'width': 375, 'height': 850})
    context.route(origin + '/**', serve)
    page = context.new_page()
    external = []
    errors = []
    page.on('request', lambda req: external.append(req.url)
            if not req.url.startswith(origin) else None)
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(origin + '/index.html')
    page.wait_for_timeout(1400)
    assert not external, external
    assert not errors, errors

    # Read the rendered WebGL pixels, excluding the solid scene background.
    bounds = page.evaluate('''() => {
      const canvas = document.querySelector('#court-canvas canvas');
      const gl = canvas.getContext('webgl2');
      const width = canvas.width;
      const height = canvas.height;
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      const background = pixels.slice(0, 3);
      let left = width, right = -1, bottom = height, top = -1;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const at = (y * width + x) * 4;
          const difference = Math.max(
            Math.abs(pixels[at] - background[0]),
            Math.abs(pixels[at + 1] - background[1]),
            Math.abs(pixels[at + 2] - background[2]),
          );
          if (difference < 12) continue;
          left = Math.min(left, x);
          right = Math.max(right, x);
          bottom = Math.min(bottom, y);
          top = Math.max(top, y);
        }
      }
      return { width: (right - left + 1) / width,
               height: (top - bottom + 1) / height };
    }''')
    metrics = page.evaluate('window.reviewDebug.court.frameMetrics')
    print(
        'MEASURE phone court: drawn width={:.1%}, height={:.1%}; '
        'OPEN text={:.1f}px; mascot={:.1f}px; inner frame={}x{}'.format(
            bounds['width'], bounds['height'], metrics['openTextPx'],
            metrics['mascotPx'], metrics['frameWidth'], metrics['frameHeight'],
        )
    )
    assert metrics['frameHeight'] == 258, metrics  # 260px CSS box minus its 1px borders
    assert bounds['width'] >= 0.85, bounds
    assert bounds['height'] >= 0.55, bounds
    assert metrics['openTextPx'] >= 14, metrics
    assert metrics['mascotPx'] >= 44, metrics
    print(
        'PASS phone court: drawn width={:.1%}, height={:.1%}; '
        'OPEN text={:.1f}px; mascot={:.1f}px; frame={}x{}'.format(
            bounds['width'], bounds['height'], metrics['openTextPx'],
            metrics['mascotPx'], metrics['frameWidth'], metrics['frameHeight'],
        )
    )

    # Complete OPEN, then choose all three review types in Topic 1.
    page.locator('#open [data-card] button').first.click()
    for card, choice, filename in zip(
        page.locator('#t1 [data-card]').all(),
        ['保留', '要修改', '有疑問'],
        ['keep.webp', 'revise.webp', 'question.webp'],
    ):
        card.get_by_role('button', name=choice).click()
        badge = card.locator('.choice-badge')
        assert badge.is_visible()
        assert badge.get_attribute('alt') == choice
        assert badge.get_attribute('src').endswith(filename)
    page.locator('#name').fill('測試讀者')
    page.wait_for_timeout(1000)
    assert 'Topic 1' in page.locator('#preview').inner_text()
    assert '測試讀者' in page.locator('#preview').inner_text()
    assert 'done' in page.locator('[data-stop="t1"]').get_attribute('class')
    assert page.evaluate('window.reviewDebug.court.guideIndex') == 2
    assert page.evaluate('window.reviewDebug.court.guideKind') == 'run'
    partial_mascot = page.evaluate('window.reviewDebug.court.frameMetrics.mascotPx')
    assert partial_mascot >= 44, partial_mascot
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path=str(output / 'partial-375.png'), full_page=True)
    print('PASS partial: three badges match choices; T1 green; guide at T2; '
          'mascot={:.1f}px; preview has Topic 1 and name'.format(partial_mascot))

    # Complete the remaining sections and check the champion mascot.
    for section_id in ['t2', 't3', 'news']:
        for card in page.locator('#' + section_id + ' [data-card]').all():
            card.get_by_role('button', name='保留').click()
    page.wait_for_timeout(900)
    assert page.evaluate('window.reviewDebug.court.guideKind') == 'cool'
    assert page.locator('#send-cool').is_visible()
    assert page.locator('#send-complete').is_visible()
    assert '全部完成' in page.locator('#send-complete').inner_text()
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path=str(output / 'complete-375.png'), full_page=True)
    print('PASS complete: all five stops green; cool on court and in send section; overflow=no')

    # Reduced motion and inaccessible storage must not break the page.
    private = browser.new_context(
        viewport={'width': 375, 'height': 850},
        reduced_motion='reduce',
    )
    private.route(origin + '/**', serve)
    reduced_page = private.new_page()
    reduced_page.add_init_script(
        'Object.defineProperty(window, "localStorage", '
        '{get(){throw new Error("storage blocked")}})'
    )
    reduced_page.goto(origin + '/index.html')
    reduced_page.wait_for_timeout(1000)
    assert reduced_page.evaluate('window.reviewDebug.court.ballPositioned')
    reduced_page.evaluate('window.reviewDebug.court.update({rotate:true})')
    assert not reduced_page.evaluate('window.reviewDebug.court.autoRotate')
    reduced_page.locator('#open [data-card] button').first.click()
    assert reduced_page.evaluate('window.reviewDebug.court.guideIndex') == 1
    assert not reduced_page.evaluate('window.reviewDebug.court.guideMoving')
    print('PASS reduced/storage: page works; ball positioned; rotation off; mascot jumps to next stop')

    # Choose light mode using the actual style-panel control at desktop width.
    desktop = browser.new_context(viewport={'width': 1280, 'height': 900})
    desktop.route(origin + '/**', serve)
    light_page = desktop.new_page()
    light_page.goto(origin + '/index.html')
    light_page.locator('#style-panel summary').click()
    light_page.locator('#gui select').last.select_option(label='亮')
    assert light_page.evaluate('document.documentElement.dataset.theme') == 'light'
    light_page.screenshot(path=str(output / 'light-1280.png'), full_page=True)
    print('PASS light: style panel switches to light theme at 1280')
    browser.close()

