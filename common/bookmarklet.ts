export const makeUrl = (script: string, legumeVer?: string) =>
  `javascript:(function(t,l,d,s,n){\
typeof Legume==n+""?(\
s=d.createElement("script"),\
s.src=l,s.setAttribute("data-legume-entry",t),\
d.head.appendChild(s)\
):\
Legume(t,{run:true})\
})(${JSON.stringify(script)},${JSON.stringify(
    `https://cdn.jsdelivr.net/npm/legume-loader@${legumeVer || "latest"}`
  )},document);`;
