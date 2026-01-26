import replicate
import os

# Set the environment variable
api_token = os.environ.get('REPLICATE_API_TOKEN')


input = {
    "prompt": "A close-up of a clear glass bowl filled with fine, light-brown Sarsaparilla Extract Powder. The powder has a soft, earthy texture. Next to the bowl, place a few pieces of Sarsaparilla root for a natural touch. The background is neutral and simple, allowing the glass bowl and the powder to stand out. Soft natural lighting highlights the transparency of the glass and the fine texture of the powder, giving it an organic and herbal atmosphere."
}

output = replicate.run(
    "black-forest-labs/flux-schnell",
    input=input
)
print(output)
