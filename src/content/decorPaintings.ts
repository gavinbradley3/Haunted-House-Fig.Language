/**
 * The house's sixteen decorative paintings, as the museum labels describe them when a student examines one.
 * Titles are the working titles from the painting inventory. Each note describes only what is painted.
 * None of them is part of a lesson; looking at them is always optional.
 */
import type { DecorId } from '../systems/paintingImages';

export interface DecorPaintingInfo {
  id: DecorId;
  title: string;
  medium: string;
  note: string;
}

const decor = (id: DecorId, title: string, medium: string, note: string): DecorPaintingInfo => ({ id, title, medium, note });

export const DECOR_PAINTINGS: Record<DecorId, DecorPaintingInfo> = {
  D01: decor(
    'D01',
    'A Ship Becalmed at Dusk',
    'Oil on canvas. Marine school, c. 1860.',
    'Not a breath of wind has reached her sails since the light began to fail. The sea lies flat as a polished table, and the ship waits on her own reflection as if the two had agreed to keep still.',
  ),
  D02: decor(
    'D02',
    'Portrait of the Builder of the House',
    'Oil on canvas. Hung by the family, c. 1858.',
    'The man who built this house kept its great iron key on his watch chain and let no other hand turn it. He looks past the painter, toward a door we cannot see.',
  ),
  D03: decor(
    'D03',
    'A Lane by Moonlight',
    'Oil on canvas, c. 1875.',
    'Rain has turned the lane into a ribbon of silver. It runs between the bare trees and an old stone wall to a gate standing open, and to a single window someone has left alight.',
  ),
  D04: decor(
    'D04',
    'Still Life with Keys and a Snuffed Candle',
    'Oil on canvas. Dutch manner, c. 1865.',
    'The candle has only just been pinched out; its smoke is still climbing. Beside it wait three iron keys, a silver watch, a loaf on a pewter plate and a letter whose red seal has never been broken.',
  ),
  D05: decor(
    'D05',
    'Lighthouse in a Gale',
    'Oil on canvas, c. 1880.',
    'The sea throws itself at the headland again and again, and the lighthouse answers with nothing but patience. Through a tear in the clouds, the moon looks on.',
  ),
  D06: decor(
    'D06',
    'The Sea at Dawn, Like a Ploughed Field',
    'Oil on canvas. Painted on the south coast, c. 1868.',
    'At first light the swell comes ashore in long, even rows, as though the whole sea had been ploughed in the night. One small boat is already out among the furrows.',
  ),
  D07: decor(
    'D07',
    'Still Life with a Pewter Jug',
    'Oil on canvas. Dutch manner, c. 1870.',
    'A pewter jug, a glass of claret, a lemon half undressed of its peel. The painter polished the jug so patiently that the room is caught in its side. Look long enough, and the room looks back.',
  ),
  D08: decor(
    'D08',
    'A House by the Lake, Night',
    'Oil on canvas, c. 1872.',
    'A dark house beside still water under a thin moon. Only one window holds a light, and the lake keeps a second, trembling moon of its own among the reeds.',
  ),
  D09: decor(
    'D09',
    'Portrait of a Young Man in Mourning',
    'Oil on canvas, 1874. The sitter’s name was not recorded on the frame.',
    'He wears full mourning: the black coat, the black band on his sleeve. His hand is closed over a gold locket, holding it the way one holds a breath.',
  ),
  D10: decor(
    'D10',
    'A Feast Fit for a Giant',
    'Oil on canvas. Painted for this dining room.',
    'A raised pie, a roasted swan, a lobster, oysters, grapes beyond counting and a silver cup large enough to bathe in. Food enough for a hundred guests, and not a single chair at the table.',
  ),
  D11: decor(
    'D11',
    'The Sleeping Hill',
    'Oil on canvas, c. 1878.',
    'Under a full moon the long ridge lies along the valley like a sleeper beneath a grey blanket of mist. The river below runs very quietly, as if afraid of waking it.',
  ),
  D12: decor(
    'D12',
    'Portrait of a Host',
    'Oil on canvas. Presented by the sitter, c. 1862.',
    'Our host sits with his knife and fork raised and a plate as bare as a winter field. By the look on his face, the next course is already late.',
  ),
  D13: decor(
    'D13',
    'A Wave as High as a Mountain',
    'Oil on canvas, c. 1876.',
    'The wave stands taller than any mountain the painter had climbed, green as bottle glass where the light breaks through it. Beneath it a small ship leans into the storm and keeps her course.',
  ),
  D14: decor(
    'D14',
    'Girl with a China Doll',
    'Oil on canvas, 1874.',
    'A little girl in her blue dress and lace pinafore, holding a china doll in a bonnet. The girl has looked away. The doll has not.',
  ),
  D15: decor(
    'D15',
    'The Willow Leaning to Listen',
    'Oil on canvas, c. 1874.',
    'Evening on the river. The old willow leans so far over the water that it seems to be listening for something beneath the surface, while the cottage windows behind it light up one by one.',
  ),
  D16: decor(
    'D16',
    'The Dolls’ House at Night',
    'Oil on canvas. Painted in this nursery, c. 1876.',
    'The dolls’ house stands by the nursery window, the moon outside and the rocking horse keeping watch. Every room is dark but one, high under the roof, where someone has left a lamp burning.',
  ),
};
