# Pending recipe photos

Eight bundled recipes show a category tile because the 17 October 2026 Higgsfield batch hit the account's daily grace-period limit after five images. Generate each with the exact prompt below (landscape 3:2, any photorealistic image model), then:

1. Re-encode as JPEG quality 80 at about 1024×688 into `assets/food/<file>` (the five delivered photos are 83–109 KB; the original PNGs are 2.3–2.6 MB).
2. Add the key to `PhotoKey` in `src/types/food.ts` and to `src/data/photos.ts`.
3. Set `photo: "<key>"` on the recipe in `src/data/recipe-library/` (the allium-free mee goreng inherits from mee goreng).
4. Append a provenance entry (file, source/model, exact prompt, use, generated date) to `assets/food/provenance.json`.

Recipe Info then reads "Illustrative image" instead of "No photo yet" automatically.

## oat-porridge

File: `assets/food/oat-porridge.jpg`

```text
Use case: photorealistic-natural. Asset type: editorial food photograph for the QuinTaste mobile recipe preview. Primary request: a bowl of creamy savoury ginger mushroom oat porridge, topped with sliced shiitake mushrooms, fine julienned ginger, small cubes of silken tofu, a drizzle of sesame oil and a few coriander leaves, in a cream ceramic bowl with a ceramic spoon. Composition: one dish in a landscape 3:2 photograph, close three-quarter overhead view, dish fully visible and centered with a little room at its edges, shallow natural depth of field, light peach-beige tabletop, restrained professional food styling. Lighting: warm soft morning window light, real food textures, natural Singapore food editorial photography. No meat, seafood, egg, onion, garlic, spring onion or fried shallot garnish. No people, hands, writing, logos, watermark, UI, borders or collage. Illustrative recipe imagery, not a photograph documenting a real restaurant.
```

## fried-bee-hoon

File: `assets/food/fried-bee-hoon.jpg`

```text
Use case: photorealistic-natural. Asset type: editorial food photograph for the QuinTaste mobile recipe preview. Primary request: Singapore vegetarian fried bee hoon, thin rice vermicelli stir-fried light golden with shredded cabbage, julienned carrot, sliced shiitake mushrooms and bean sprouts, topped with a few slices of fresh red chilli, served on a white oval plate. Composition: one dish in a landscape 3:2 photograph, close three-quarter overhead view, dish fully visible and centered with a little room at its edges, shallow natural depth of field, light peach-beige tabletop, restrained professional food styling. Lighting: warm soft morning window light, real food textures, natural Singapore food editorial photography. No meat, seafood, egg, onion, garlic, spring onion or fried shallot garnish. No people, hands, writing, logos, watermark, UI, borders or collage. Illustrative recipe imagery, not a photograph documenting a real restaurant.
```

## mee-goreng (also used by mee-goreng-gentle)

File: `assets/food/mee-goreng.jpg`

```text
Use case: photorealistic-natural. Asset type: editorial food photograph for the QuinTaste mobile recipe preview. Primary request: vegan mee goreng, yellow wheat noodles wok-fried in a glossy red-brown sweet tomato chilli sauce with cubes of golden tempeh, bok choy, bean sprouts and tomato wedges, a lime half on the side, on a white oval plate. Composition: one dish in a landscape 3:2 photograph, close three-quarter overhead view, dish fully visible and centered with a little room at its edges, shallow natural depth of field, light peach-beige tabletop, restrained professional food styling. Lighting: warm soft morning window light, real food textures, natural Singapore food editorial photography. No meat, seafood, egg, onion, garlic, spring onion or fried shallot garnish. No people, hands, writing, logos, watermark, UI, borders or collage. Illustrative recipe imagery, not a photograph documenting a real restaurant.
```

## nasi-lemak

File: `assets/food/nasi-lemak.jpg`

```text
Use case: photorealistic-natural. Asset type: editorial food photograph for the QuinTaste mobile recipe preview. Primary request: vegan nasi lemak on a banana-leaf lined round plate, a neat mound of fragrant coconut rice, glossy red sambal tempeh, roasted peanuts, sliced cucumber and a few crisp golden tofu pieces. Composition: one dish in a landscape 3:2 photograph, close three-quarter overhead view, dish fully visible and centered with a little room at its edges, shallow natural depth of field, light peach-beige tabletop, restrained professional food styling. Lighting: warm soft morning window light, real food textures, natural Singapore food editorial photography. No meat, anchovies, fish, seafood, egg, onion, garlic, spring onion or fried shallot garnish. No people, hands, writing, logos, watermark, UI, borders or collage. Illustrative recipe imagery, not a photograph documenting a real restaurant.
```

## mapo-tofu

File: `assets/food/mapo-tofu.jpg`

```text
Use case: photorealistic-natural. Asset type: editorial food photograph for the QuinTaste mobile recipe preview. Primary request: Sichuan-style vegan mapo tofu, soft silken tofu cubes in a glossy deep-red chilli bean sauce with finely minced shiitake mushrooms, sprinkled with ground Sichuan pepper, in a shallow cream bowl, a small bowl of white rice beside it. Composition: one dish in a landscape 3:2 photograph, close three-quarter overhead view, dish fully visible and centered with a little room at its edges, shallow natural depth of field, light peach-beige tabletop, restrained professional food styling. Lighting: warm soft morning window light, real food textures, natural Singapore food editorial photography. No meat, seafood, egg, onion, garlic, spring onion or fried shallot garnish. No people, hands, writing, logos, watermark, UI, borders or collage. Illustrative recipe imagery, not a photograph documenting a real restaurant.
```

## popiah

File: `assets/food/popiah.jpg`

```text
Use case: photorealistic-natural. Asset type: editorial food photograph for the QuinTaste mobile recipe preview. Primary request: fresh Singapore popiah rolls, soft thin wheat crepes wrapped around braised shredded jicama and carrot, lettuce, bean sprouts and crushed peanuts, cut in half to show the filling, three rolls on a white plate with a small dish of dark sweet sauce and a small dish of chilli. Composition: one dish in a landscape 3:2 photograph, close three-quarter overhead view, dish fully visible and centered with a little room at its edges, shallow natural depth of field, light peach-beige tabletop, restrained professional food styling. Lighting: warm soft morning window light, real food textures, natural Singapore food editorial photography. No meat, shrimp, seafood, egg, onion, garlic, spring onion or fried shallot garnish. No people, hands, writing, logos, watermark, UI, borders or collage. Illustrative recipe imagery, not a photograph documenting a real restaurant.
```

## bubur-cha-cha

File: `assets/food/bubur-cha-cha.jpg`

```text
Use case: photorealistic-natural. Asset type: editorial food photograph for the QuinTaste mobile recipe preview. Primary request: bubur cha cha dessert, creamy pale coconut milk with cubes of orange and purple sweet potato and yam, small clear sago pearls and a few colourful chewy tapioca cubes, in a white ceramic bowl with a knotted pandan leaf beside it. Composition: one dish in a landscape 3:2 photograph, close three-quarter overhead view, dish fully visible and centered with a little room at its edges, shallow natural depth of field, light peach-beige tabletop, restrained professional food styling. Lighting: warm soft morning window light, real food textures, natural Singapore food editorial photography. No meat, seafood, egg, onion, garlic, spring onion or fried shallot garnish. No people, hands, writing, logos, watermark, UI, borders or collage. Illustrative recipe imagery, not a photograph documenting a real restaurant.
```

## sago-gula-melaka

File: `assets/food/sago-gula-melaka.jpg`

```text
Use case: photorealistic-natural. Asset type: editorial food photograph for the QuinTaste mobile recipe preview. Primary request: sago gula melaka dessert, a small dome of chilled white sago pudding drizzled with dark glossy gula melaka palm sugar syrup and a pool of coconut milk, on a small white plate with a pandan leaf beside it. Composition: one dish in a landscape 3:2 photograph, close three-quarter overhead view, dish fully visible and centered with a little room at its edges, shallow natural depth of field, light peach-beige tabletop, restrained professional food styling. Lighting: warm soft morning window light, real food textures, natural Singapore food editorial photography. No meat, seafood, egg, onion, garlic, spring onion or fried shallot garnish. No people, hands, writing, logos, watermark, UI, borders or collage. Illustrative recipe imagery, not a photograph documenting a real restaurant.
```
