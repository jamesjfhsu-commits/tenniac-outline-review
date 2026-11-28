"""Check the seekable party scene and party buttons on phone and desktop."""
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8000/dada/"
ANIMATION = """size => {
    const timeline = window.__opening.pause();
    const select = selector => document.querySelector(selector);
    const cards = [...document.querySelectorAll('.party-card')];
    const white = select('.party-card-white');
    const stage = select('#opening').getBoundingClientRect();
    const mascot = select('#star');
    const visible = element => {
        const style = getComputedStyle(element);
        return style.visibility === 'visible' && +style.opacity > 0;
    };
    const inside = rect => rect.left >= stage.left && rect.right <= stage.right &&
        rect.top >= stage.top && rect.bottom <= stage.bottom;
    const overlap = (a, b) => a.left < b.right && a.right > b.left &&
        a.top < b.bottom && a.bottom > b.top;
    const pose = name => visible(select(`#star [data-pose="${name}"]`));
    const results = {};
    function check(time, label, test) {
        timeline.seek(time);
        results[label] = test();
    }
    check(11.45, 'three cards, correct size, contained and separated', () => {
        const boxes = cards.map(card => card.getBoundingClientRect());
        return cards.length === 3 && cards.every(visible) &&
            boxes.every((box, i) => inside(box) &&
                Math.abs(box.width - size) < .1 && Math.abs(box.height - size) < .1 &&
                boxes.slice(i + 1).every(next => !overlap(box, next)));
    });
    if (size === 65) {
        const range = document.createRange();
        range.selectNodeContents(select('.caption-scene:nth-child(2) span:last-child'));
        const rows = new Set([...range.getClientRects()].map(rect => rect.top));
        results['caption at most two lines'] = rows.size > 0 && rows.size <= 2;
    }
    let overlapCount = 0;
    let layered = true;
    for (let frame = 690; frame <= 786; frame++) {
        timeline.seek(frame / 60);
        const box = white.getBoundingClientRect();
        if (visible(white) && overlap(box, mascot.getBoundingClientRect())) {
            overlapCount++;
            layered &&= white.contains(document.elementFromPoint(
                (box.left + box.right) / 2, (box.top + box.bottom) / 2));
        }
    }
    results[`white card wins hit testing on ${overlapCount} overlapping frames`] =
        overlapCount > 0 && layered;
    check(11.6, 'white card stamped', () => visible(select('.party-stamp')));
    check(12.1, 'other cards hidden', () => cards.filter(card => card !== white)
        .every(card => !visible(card)));
    check(12.35, 'wink before card exits', () => pose('wink') && visible(white) &&
        overlap(white.getBoundingClientRect(), stage));
    check(13.05, 'white card outside stage', () => white.getBoundingClientRect().left >= stage.right);
    check(13.1, 'white card hidden', () => !visible(white));
    check(13.5, 'scene three starts with run', () => timeline.labels.s3 === 13.5 && pose('run'));
    check(15.99, 'ball held until drop', () => !visible(select('#ball')));
    check(16, 'serve and ball launch on drop', () => pose('serve') && visible(select('#ball')));
    const origin = select('#ball').getBoundingClientRect().left;
    check(16.1, 'ball advances after serve', () => select('#ball').getBoundingClientRect().left > origin);
    results['25-second timeline'] = timeline.duration() === 25;
    return results;
}"""


def main():
    results = []

    def check(width, label, passed):
        results.append(bool(passed))
        print(f"{'PASS' if passed else 'FAIL'} {width} {label}")

    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="msedge")
        for width, size in ((375, 65), (1280, 82)):
            page = browser.new_page(viewport={"width": width, "height": 900})
            page.goto(URL, wait_until="networkidle")
            gate = page.locator("[data-start]")
            if gate.is_visible():
                gate.click()
                page.wait_for_function("document.querySelector('[data-start]').hidden")
            for label, passed in page.evaluate(ANIMATION, size).items():
                check(width, label, passed)

            page.evaluate("() => { window.__opening.pause().seek(5); }")
            page.locator("#skip-opening").click()
            check(width, "skip ends the timeline", page.evaluate("window.__opening.time() === 25"))
            page.locator("#replay-opening").click()
            check(width, "replay starts again", page.evaluate("window.__opening.time() < 5"))
            page.evaluate("() => { window.__opening.pause().seek(11.45); }")
            cards = page.locator(".party-card:visible")
            check(width, "all three cards restored on replay", cards.count() == 3)

            buttons = page.locator(".party-buttons button")
            image = page.locator("#party-mascot")
            welcome = page.locator("#welcome")
            greetings = []
            for i, pose in enumerate(("heart", "wink", "jump")):
                button = buttons.nth(i)
                button.focus()
                button.press("Enter")
                image.evaluate("(img) => img.decode()")
                greetings.append(welcome.inner_text())
                state = buttons.locator("xpath=..").first.locator('[aria-pressed="true"]')
                check(width, f"{pose} selected with correct image and alt",
                      state.count() == 1 and button.get_attribute("aria-pressed") == "true" and
                      image.get_attribute("src").endswith(f"/{pose}.webp") and
                      image.get_attribute("alt") == "小球怪示意" + button.inner_text() and
                      image.evaluate("(img) => img.naturalWidth > 0"))
            check(width, "three distinct welcome texts", all(greetings) and len(set(greetings)) == 3)
            page.close()

            reduced = browser.new_page(viewport={"width": width, "height": 900}, reduced_motion="reduce")
            reduced.goto(URL, wait_until="networkidle")
            check(width, "reduced motion ends the timeline",
                  reduced.evaluate("window.__opening.time() === 25 && window.__opening.paused()"))
            reduced.close()
        browser.close()

    print(f"checks: {sum(results)}/{len(results)} passed")
    return 0 if all(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
