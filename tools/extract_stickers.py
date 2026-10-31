"""Extract only the approved Tenniac mascot poses from the fixed PDF sheet."""

import os
import sys

import pypdfium2 as pdfium


# Name: (image index on page one, expected top-left in PDF points).
PICK = {
    "hello": (32, (680, 596)),
    "serve": (9, (511, 291)),
    "desk": (26, (521, 177)),
    "rest": (5, (375, 468)),
    "jump": (6, (230, 448)),
    "news": (25, (527, 47)),
    "heart": (38, (813, 184)),
    "wink": (33, (67, 313)),
    "keep": (2, (76, 65)),
    "revise": (16, (405, 593)),
    "question": (21, (654, 319)),
    "run": (3, (361, 47)),
    "cool": (28, (230, 318)),
}


def main(source, output):
    # Validate every position before writing any output.
    document = pdfium.PdfDocument(open(source, "rb").read())
    page = document[0]
    height = page.get_size()[1]
    images = [obj for obj in page.get_objects() if obj.type == 3]
    for name, (index, (expected_x, expected_y)) in PICK.items():
        left, _bottom, _right, top = images[index].get_bounds()
        assert abs(left - expected_x) < 2, f"{name}: image {index} moved horizontally"
        assert abs(height - top - expected_y) < 2, f"{name}: image {index} moved vertically"

    os.makedirs(output, exist_ok=True)
    for name, (index, _position) in PICK.items():
        image = images[index].get_bitmap(render=True).to_pil().convert("RGBA")
        bounds = image.getchannel("A").getbbox()
        assert bounds is not None, f"{name}: empty transparent image"
        image = image.crop(bounds)
        image.thumbnail((320, 320))
        image.save(os.path.join(output, f"{name}.webp"), "WEBP", quality=82, method=6)
    total = sum(os.path.getsize(os.path.join(output, f"{name}.webp")) for name in PICK)
    print(f"Extracted {len(PICK)} stickers; total {total} bytes")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
