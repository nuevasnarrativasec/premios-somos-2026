/* ============================================================
   Carga en vivo desde Google Sheets (gviz CSV)
   ============================================================ */
const SHEET_ID  = "18E-NKGX77LP4AHHemJhakIKLTrQzcFM3MeStDCNHvVk";
const TAB_PUB   = "voto-del-publico";
const TAB_JUR   = "premio-del-jurado";
const IMG_DIR   = "img/restaurantes"; // fotos locales: img/restaurantes/<slug>.jpg
const IMG_EXT   = "jpg";
const gvizUrl = (t) => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(t)}`;

/* ---------- CSV parser (comillas + saltos de línea) ---------- */
function parseCSV(text){
  const rows=[]; let row=[],field="",i=0,q=false;
  while(i<text.length){const c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){field+='"';i++;} else q=false; } else field+=c; }
    else{ if(c==='"')q=true; else if(c===','){row.push(field);field="";}
      else if(c==='\n'){row.push(field);rows.push(row);row=[];field="";}
      else if(c==='\r'){} else field+=c; }
    i++;
  }
  if(field.length||row.length){row.push(field);rows.push(row);}
  return rows.filter(r=>r.some(c=>c.trim()!==""));
}
function toObjects(rows){
  if(!rows.length)return[];
  const head=rows[0].map(h=>h.trim());
  return rows.slice(1).map(r=>{const o={};head.forEach((h,i)=>o[h]=(r[i]||"").trim());return o;});
}
async function fetchTab(tab){
  const res=await fetch(gvizUrl(tab),{cache:"no-store"});
  if(!res.ok)throw new Error("HTTP "+res.status);
  return toObjects(parseCSV(await res.text()));
}

/* ---------- Helpers ---------- */
const esc=s=>(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
function pick(o,names){for(const n of names)for(const k in o)if(k.toLowerCase().trim()===n.toLowerCase())return o[k];return"";}
function slug(s){return (s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")
  .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");}

function photoBlock(cat, win, imgOverride){
  const src = imgOverride || `${IMG_DIR}/${slug(cat)}.${IMG_EXT}`;
  const initial = esc((win||"·").trim().charAt(0).toUpperCase());
  return `<div class="photo">
    <img src="${esc(src)}" alt="${esc(win)}" loading="lazy"
         onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
    <div class="fallback" style="display:none">${initial}</div>
  </div>`;
}
function socialBlock(handle,url){
  if(!handle && !url) return "";
  const href = url || "https://instagram.com/"+(handle||"").replace(/^@/,"");
  const label = handle || "Ver perfil";
  return `<a class="handle" href="${esc(href)}" target="_blank" rel="noopener">${esc(label)}</a>`;
}

function ficha(r,{finalistas=false}={}){
  const cat=pick(r,["Categoría","Categoria"]);
  const win=pick(r,["Restaurante ganador","Ganador"]);
  const handle=pick(r,["Instagram"]);
  const url=pick(r,["Enlace a redes sociales","Enlace a redes"]);
  const imgOverride=pick(r,["Imagen","Foto","Image"]); // opcional si algún día se agrega al Sheet
  let finBlock="";
  if(finalistas){
    const fins=pick(r,["Finalistas"]).split(",").map(s=>s.trim()).filter(Boolean);
    if(fins.length) finBlock=`<div class="finalistas"><div class="flabel">Finalistas</div><div class="fnames">${fins.map(esc).join(" · ")}</div></div>`;
  }
  return `<article class="ficha">
    <div class="cat-header"><span class="cat-frame">${esc(cat)}</span></div>
    ${photoBlock(cat,win,imgOverride)}
    <div class="ficha-body-main">
        <div class="pin"></div>
        <div class="ficha-body">
            <h3 class="ficha-name">${esc(win)}</h3>
            ${socialBlock(handle,url)}
            ${finBlock}
        </div>
    </div>
  </article>`;
}

function render(id,data,opts){
  const grid=document.getElementById(id);
  if(!data.length){grid.innerHTML='<div class="state err">No se encontraron datos.</div>';return;}
  grid.innerHTML=data.map(r=>ficha(r,opts)).join("");
}
function showErr(id,tab){
  document.getElementById(id).innerHTML=
    `<div class="state err">No se pudo cargar la pestaña “${tab}”.<br>Verifica que el spreadsheet siga compartido como “cualquiera con el enlace”.</div>`;
}

(async function(){
  try{ render("jury-grid", await fetchTab(TAB_JUR), {finalistas:true}); }
  catch(e){ console.error(e); showErr("jury-grid",TAB_JUR); }
  try{ render("pub-grid", await fetchTab(TAB_PUB), {finalistas:false}); }
  catch(e){ console.error(e); showErr("pub-grid",TAB_PUB); }
})();
