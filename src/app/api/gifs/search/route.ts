import { NextResponse } from "next/server";

interface GifItem {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
}

// Built-in high quality, reliable animated GIF dictionary for popular search queries
const FALLBACK_DATABASE: Record<string, GifItem[]> = {
  trending: [
    { id: "tr1", title: "Celebration Fireworks", url: "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif", previewUrl: "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif" },
    { id: "tr2", title: "Thumbs Up Kid", url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif", previewUrl: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif" },
    { id: "tr3", title: "Mind Blown Galaxy", url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif", previewUrl: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif" },
    { id: "tr4", title: "Clapping Applause", url: "https://media.giphy.com/media/l3q2XhfQ8oCkm1Row/giphy.gif", previewUrl: "https://media.giphy.com/media/l3q2XhfQ8oCkm1Row/giphy.gif" },
    { id: "tr5", title: "Carlton Dance", url: "https://media.giphy.com/media/dh0l3f0w594b6/giphy.gif", previewUrl: "https://media.giphy.com/media/dh0l3f0w594b6/giphy.gif" },
    { id: "tr6", title: "Cat Laughing", url: "https://media.giphy.com/media/10JhgA679DqO3u/giphy.gif", previewUrl: "https://media.giphy.com/media/10JhgA679DqO3u/giphy.gif" },
    { id: "tr7", title: "Success Kid", url: "https://media.giphy.com/media/nNxT5bh3VIizs3WDxA/giphy.gif", previewUrl: "https://media.giphy.com/media/nNxT5bh3VIizs3WDxA/giphy.gif" },
    { id: "tr8", title: "Popcorn Watching", url: "https://media.giphy.com/media/gl0mkIZOW6Nwc/giphy.gif", previewUrl: "https://media.giphy.com/media/gl0mkIZOW6Nwc/giphy.gif" }
  ],
  thumbs: [
    { id: "th1", title: "Thumbs Up Kid", url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif", previewUrl: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif" },
    { id: "th2", title: "Cat Thumbs Up", url: "https://media.giphy.com/media/XreQmk7ETCak0/giphy.gif", previewUrl: "https://media.giphy.com/media/XreQmk7ETCak0/giphy.gif" },
    { id: "th3", title: "Minion Approval", url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif", previewUrl: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif" },
    { id: "th4", title: "Iron Man Thumbs Up", url: "https://media.giphy.com/media/b6tL5Bic6mP9S/giphy.gif", previewUrl: "https://media.giphy.com/media/b6tL5Bic6mP9S/giphy.gif" }
  ],
  laugh: [
    { id: "l1", title: "Laughing Out Loud", url: "https://media.giphy.com/media/10JhgA679DqO3u/giphy.gif", previewUrl: "https://media.giphy.com/media/10JhgA679DqO3u/giphy.gif" },
    { id: "l2", title: "Cat Rolling Laughing", url: "https://media.giphy.com/media/kC8N6DPOkbqWTxkNTe/giphy.gif", previewUrl: "https://media.giphy.com/media/kC8N6DPOkbqWTxkNTe/giphy.gif" },
    { id: "l3", title: "Steve Carell Laugh", url: "https://media.giphy.com/media/13m2VVC7rTOoA8/giphy.gif", previewUrl: "https://media.giphy.com/media/13m2VVC7rTOoA8/giphy.gif" },
    { id: "l4", title: "ROFL Laughing", url: "https://media.giphy.com/media/n9kJvPP6A5T4q3mZ2D/giphy.gif", previewUrl: "https://media.giphy.com/media/n9kJvPP6A5T4q3mZ2D/giphy.gif" }
  ],
  celebrate: [
    { id: "c1", title: "Confetti Celebration", url: "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif", previewUrl: "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif" },
    { id: "c2", title: "Snoopy Happy Dance", url: "https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif", previewUrl: "https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif" },
    { id: "c3", title: "Party Popper", url: "https://media.giphy.com/media/26tOZ42Mg6pbTUPHW/giphy.gif", previewUrl: "https://media.giphy.com/media/26tOZ42Mg6pbTUPHW/giphy.gif" }
  ],
  love: [
    { id: "lv1", title: "Heart Explosion", url: "https://media.giphy.com/media/26FLdmIp6wJr91JAI/giphy.gif", previewUrl: "https://media.giphy.com/media/26FLdmIp6wJr91JAI/giphy.gif" },
    { id: "lv2", title: "Cat Blowing Kisses", url: "https://media.giphy.com/media/Kzb1G07McdC1W/giphy.gif", previewUrl: "https://media.giphy.com/media/Kzb1G07McdC1W/giphy.gif" },
    { id: "lv3", title: "Bear Hug", url: "https://media.giphy.com/media/l41YkxvU8c7J7Bba0/giphy.gif", previewUrl: "https://media.giphy.com/media/l41YkxvU8c7J7Bba0/giphy.gif" }
  ],
  dance: [
    { id: "d1", title: "Carlton Dance", url: "https://media.giphy.com/media/dh0l3f0w594b6/giphy.gif", previewUrl: "https://media.giphy.com/media/dh0l3f0w594b6/giphy.gif" },
    { id: "d2", title: "Happy Dance Kid", url: "https://media.giphy.com/media/l2JIdnF6aJXA6Bf1S/giphy.gif", previewUrl: "https://media.giphy.com/media/l2JIdnF6aJXA6Bf1S/giphy.gif" },
    { id: "d3", title: "Dancing Penguin", url: "https://media.giphy.com/media/13CoXDiaCcCvg4/giphy.gif", previewUrl: "https://media.giphy.com/media/13CoXDiaCcCvg4/giphy.gif" }
  ],
  mindblown: [
    { id: "mb1", title: "Mind Blown Galaxy", url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif", previewUrl: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif" },
    { id: "mb2", title: "Cat Shocked", url: "https://media.giphy.com/media/LpLd2NGvOi5ft0HfSW/giphy.gif", previewUrl: "https://media.giphy.com/media/LpLd2NGvOi5ft0HfSW/giphy.gif" }
  ],
  sad: [
    { id: "s1", title: "Crying Cat", url: "https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif", previewUrl: "https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif" },
    { id: "s2", title: "Rain Crying", url: "https://media.giphy.com/media/d22NqpjOcXZ8Q/giphy.gif", previewUrl: "https://media.giphy.com/media/d22NqpjOcXZ8Q/giphy.gif" }
  ],
  cool: [
    { id: "cl1", title: "Sunglasses Cat", url: "https://media.giphy.com/media/COYGe9rZvfiaQ/giphy.gif", previewUrl: "https://media.giphy.com/media/COYGe9rZvfiaQ/giphy.gif" },
    { id: "cl2", title: "Deal With It", url: "https://media.giphy.com/media/Vj97qNut6axHa/giphy.gif", previewUrl: "https://media.giphy.com/media/Vj97qNut6axHa/giphy.gif" }
  ]
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "trending").trim().toLowerCase();

  // 1. Try Giphy Public Endpoint with multiple fallback mirrors
  try {
    const giphyRes = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=dc6zaTOxFJmzC&q=${encodeURIComponent(q)}&limit=24&rating=g`,
      { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (giphyRes.ok) {
      const data = await giphyRes.json();
      if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
        const gifs: GifItem[] = data.data.map((item: any) => ({
          id: item.id,
          title: item.title || "GIF",
          url: item.images?.downsized_medium?.url || item.images?.original?.url || item.images?.fixed_height?.url,
          previewUrl: item.images?.fixed_height_small?.url || item.images?.downsized_small?.url || item.images?.original?.url,
        }));
        return NextResponse.json({ gifs });
      }
    }
  } catch (err) {
    // Continue to Tenor / Giphy media search
  }

  // 2. Try Tenor API fallback
  try {
    const tenorRes = await fetch(
      `https://g.tenor.com/v1/search?q=${encodeURIComponent(q)}&key=LIVDSRZULELA&limit=24`,
      { cache: "no-store" }
    );
    if (tenorRes.ok) {
      const data = await tenorRes.json();
      if (data?.results && Array.isArray(data.results) && data.results.length > 0) {
        const gifs: GifItem[] = data.results.map((item: any, idx: number) => ({
          id: `tenor-${item.id || idx}`,
          title: item.title || item.content_description || "GIF",
          url: item.media?.[0]?.gif?.url || item.media?.[0]?.tinygif?.url,
          previewUrl: item.media?.[0]?.tinygif?.url || item.media?.[0]?.gif?.url,
        }));
        return NextResponse.json({ gifs });
      }
    }
  } catch (err) {
    // Continue to fallback dictionary
  }

  // 3. Fallback matching dictionary based on query keyword
  let matchingGifs: GifItem[] = [];
  for (const [key, list] of Object.entries(FALLBACK_DATABASE)) {
    if (q.includes(key) || key.includes(q)) {
      matchingGifs = [...matchingGifs, ...list];
    }
  }

  if (matchingGifs.length === 0) {
    matchingGifs = FALLBACK_DATABASE["trending"];
  }

  return NextResponse.json({ gifs: matchingGifs });
}
