# Hero image source

`hero-atelier.jpg` and `hero-atelier.webp` are the hero still. They are a placeholder generated with ImagineArt (model: ImagineArt 2.0) from a text prompt, then resized to 1920 px wide. They show no real person, atelier or brand, but they are AI-generated, not a photo of a real atelier. Replace them with a real photo when one exists. The on-page label says so.

Prompt used:

> Cinematic photograph inside an elegant bridal dress atelier, warm golden hour light, ivory gowns on racks, crystal chandelier, brick wall, tall window with sheer curtains. Over-the-shoulder view: a female shop manager in a hijab and modest long dress taps a smartphone screen held between her and a young male salesman at a marble counter, both smiling and working together. Shallow depth of field, 35mm lens, soft film grain. No text, no logos, no watermark.

Check ImagineArt's current terms for commercial use of generated images before this goes on a public page.

The earlier Pexels clip (`hero.mp4`) and its poster were removed; the page no longer uses video.

## Motion

The slight movement on scroll is pure CSS, in `gg.css` (`.gg-hero-media img`): a named `view-timeline` on the hero (`--gg-hero`) with `animation-range: exit`, behind `@supports (animation-timeline: view())` and `prefers-reduced-motion: no-preference`. Browsers without scroll-driven animations, and users who prefer reduced motion, get the still image.
