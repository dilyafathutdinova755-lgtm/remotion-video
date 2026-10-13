import sys
from PIL import Image
files=sys.argv[2:]; out=sys.argv[1]
ims=[Image.open(f).convert("RGB").resize((360,640)) for f in files]
cols=min(5,len(ims)); rows=(len(ims)+cols-1)//cols
sh=Image.new("RGB",(cols*364,rows*644),"#222")
for i,im in enumerate(ims): sh.paste(im,((i%cols)*364,(i//cols)*644))
sh.save(out)
