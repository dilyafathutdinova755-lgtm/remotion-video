#!/usr/bin/env python3
"""ОГЭ variant of the real app icon: the grid under «Е» is rebuilt by lattice-shifting clean
parts of the same icon (v1, v2 = one grid cell), then «О» (Montserrat 800, cap height of the
original word) is drawn in. Everything else is the original ru/logo.png pixel for pixel.
Fonts: assets/fonts/Montserrat-800.ttf (download from Google Fonts, gitignored)."""
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import os
L=os.path.dirname(os.path.abspath(__file__))+'/'
src=Image.open(L+'ru/logo.png').convert('RGBA'); A=np.asarray(src).astype(float)
rgb=A[...,:3]; H,W=rgb.shape[:2]
v1=np.array([116.3,29.8]); v2=np.array([29.75,-115.75])
white=rgb.min(axis=2)>170
def dil(m,r):
    out=m.copy()
    for dy in range(-r,r+1):
        for dx in range(-r,r+1):
            if dx*dx+dy*dy<=r*r: out|=np.roll(np.roll(m,dy,0),dx,1)
    return out
text=np.zeros_like(white); text[285:585]=white[285:585]; text[625:760]=white[625:760]
text=dil(text,14)
inside=rgb[...,2]>150
inside=~dil(~inside,28)
clean=inside&~text
# low-frequency plane of the blue (non-line, non-text) pixels
pure=inside&~text&(rgb[...,0]<40)
yy,xx=np.nonzero(pure); M=np.c_[np.ones_like(xx),xx,yy].astype(float)
coef=[np.linalg.lstsq(M,rgb[yy,xx,c],rcond=None)[0] for c in range(3)]
def plane(x,y): return np.stack([c[0]+c[1]*x+c[2]*y for c in coef],-1)
def samp(ys,xs):
    y0=np.floor(ys).astype(int); x0=np.floor(xs).astype(int); fy=(ys-y0)[...,None]; fx=(xs-x0)[...,None]
    return rgb[y0,x0]*(1-fy)*(1-fx)+rgb[y0+1,x0]*fy*(1-fx)+rgb[y0,x0+1]*(1-fy)*fx+rgb[y0+1,x0+1]*fy*fx
# region to rebuild: the letter Е (and room for a wider О)
x0,x1,y0,y1=120,412,286,582
ys,xs=np.mgrid[y0:y1,x0:x1].astype(float)
out=rgb[y0:y1,x0:x1].copy(); done=np.zeros(ys.shape,bool)
shifts=sorted([(n1,n2) for n1 in range(-6,7) for n2 in range(-6,7)], key=lambda n: np.hypot(*(n[0]*v1+n[1]*v2)))
for n1,n2 in shifts:
    s=n1*v1+n2*v2; qx=xs+s[0]; qy=ys+s[1]
    ok=(~done)&(qx>=1)&(qx<W-2)&(qy>=1)&(qy<H-2)
    if not ok.any(): continue
    qi=np.clip(np.round(qy).astype(int),0,H-1); qj=np.clip(np.round(qx).astype(int),0,W-1)
    ok&=clean[qi,qj]
    if not ok.any(): continue
    val=samp(qy,qx)+plane(xs,ys)-plane(qx,qy)
    out[ok]=val[ok]; done|=ok
    if done.all(): break
print('filled',done.mean())
bg=rgb.copy(); bg[y0:y1,x0:x1]=out
# draw О: Montserrat Black, cap height of the original Е (248 px)
f=ImageFont.truetype(L+'assets/fonts/Montserrat-'+__import__('os').environ.get('WT','800')+'.ttf',600)
cb=f.getbbox('Е'); scale=248/(cb[3]-cb[1])
g=Image.new('L',(900,900),0); ImageDraw.Draw(g).text((100,50),'О',font=f,fill=255)
g=g.crop(g.getbbox())
SX=float(__import__('os').environ.get('SX','0.84'))
g=g.resize((int(g.width*scale*SX),int(g.height*scale)),Image.LANCZOS)
oy=308+124-g.height/2   # centred on the cap line of the original word
ox=int(__import__('os').environ.get('OX','176'))
alpha=np.zeros((H,W)); alpha[int(round(oy)):int(round(oy))+g.height, ox:ox+g.width]=np.asarray(g)/255.0
res=bg*(1-alpha[...,None])+255*alpha[...,None]
outimg=np.dstack([np.clip(res,0,255),A[...,3]]).astype(np.uint8)
Image.fromarray(outimg,'RGBA').save(L+'assets/logo-oge.png')
print('O size',g.size,'x',ox,ox+g.width,'y',round(oy),round(oy)+g.height)
