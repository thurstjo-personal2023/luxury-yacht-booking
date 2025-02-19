import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateImages() {
  const prompts = {
    'yacht-hero.jpg': "Ultra-wide panoramic shot of a luxury superyacht at sunset, sleek modern design, aerial view showing the full length, crystal clear Mediterranean waters, dramatic lighting, photorealistic, high-end luxury lifestyle",
    'featured-yacht.jpg': "Close-up professional photograph of a luxury yacht's deck with white leather seating, polished teak wood, champagne glasses, and ocean view, luxury lifestyle, photorealistic",
    'diving.jpg': "Underwater photography of scuba diver near coral reef with school of tropical fish, crystal clear blue water, sunlight streaming through, professional diving experience, photorealistic",
    'resort.jpg': "Luxury infinity pool overlooking the ocean at sunset, with comfortable loungers, palm trees, and elegant umbrellas, 5-star resort amenity, photorealistic"
  };

  for (const [filename, prompt] of Object.entries(prompts)) {
    try {
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "hd",
        style: "natural",
      });

      // The image URL will be available in response.data[0].url
      console.log(`Generated ${filename}: ${response.data[0].url}`);
      
      // Download and save the image
      const imageResponse = await fetch(response.data[0].url);
      const arrayBuffer = await imageResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Save to the public directory
      await Bun.write(`client/public/${filename}`, buffer);
      
    } catch (error) {
      console.error(`Error generating ${filename}:`, error);
    }
  }
}

generateImages().catch(console.error);
