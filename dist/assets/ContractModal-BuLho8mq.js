import{r as l,j as e}from"./vendor-react-K_sBQnKm.js";import{a as k}from"./index-CfrXEs3B.js";import{M as ee,b as K,B as g,L as w,I as C}from"./ui-C3W7x-Pa.js";import{e as S}from"./vendor-convex-BlUk3JZ8.js";import{aO as te,o as se,aQ as ie,x as ne,a7 as re,F as ae,aP as de,a5 as le}from"./vendor-icons-CaOtI6X6.js";function oe(){var s,r;return typeof window<"u"&&typeof window.PublicKeyCredential=="function"&&!!((r=(s=window.navigator)==null?void 0:s.credentials)!=null&&r.create)}function pe(s){const r=new Uint8Array(s);let d="";for(const x of r)d+=String.fromCharCode(x);return btoa(d).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}function D(){return{mode:"fallback",verified:!0}}async function xe(){if(!oe())return D();try{const s=await window.navigator.credentials.create({publicKey:{rp:{name:"ViP Yemen"},user:{id:crypto.getRandomValues(new Uint8Array(32)),name:`vip-${Date.now()}`,displayName:"مستفيد ViP Yemen"},challenge:crypto.getRandomValues(new Uint8Array(32)),pubKeyCredParams:[{type:"public-key",alg:-7},{type:"public-key",alg:-257}],authenticatorSelection:{authenticatorAttachment:"platform",userVerification:"required",residentKey:"preferred"},timeout:6e4,attestation:"none"}});return s?{mode:"webauthn",credentialId:pe(s.rawId),verified:!0}:D()}catch{throw new O}}class O extends Error{constructor(){super("تعذّر استخدام ماسح البصمة على هذا الجهاز")}}const ue={draft:"مسودة — بانتظار التوقيع",signed:"موقّعة إلكترونياً بالبصمة",paid:"مسدَّدة — سند دفع نهائي",void:"ملغاة"},ce={USD:"دولار أميركي",YER:"ريال يمني",SAR:"ريال سعودي",EUR:"يورو"};function T(s){if(!s)return"—";try{return new Date(s).toLocaleString("ar-YE",{dateStyle:"full",timeStyle:"short"})}catch{return new Date(s).toISOString()}}function W(s,r){return`${r==="USD"?"$":""}${s.toLocaleString("en-US")} ${ce[r]??r}`}function y(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function me(s){var f,t;const r=window.open("","_blank","width=820,height=980");if(!r){alert("تعذّر فتح نافذة الطباعة — اسمح بالنوافذ المنبثقة ثم أعد المحاولة.");return}const d=s.status==="paid",x=((f=s.fingerprint)==null?void 0:f.mode)==="webauthn"?"بصمة إلكترونية موثّقة (WebAuthn)":s.fingerprint?"تأكيد إلكتروني مسجَّل (مسار بديل)":"—",b=`<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>سند دفع ${y(s.receiptNo??"")} — ViP Yemen</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; color: #101528; margin: 0; background: #fff; }
  .sheet { max-width: 760px; margin: 0 auto; padding: 28px; border: 2px solid #c9a227; border-radius: 14px; }
  header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0b1b33; padding-bottom: 14px; }
  .brand { font-size: 22px; font-weight: 900; color: #0b1b33; }
  .brand span { color: #b98a12; }
  .no { text-align: left; font-size: 13px; color: #444; }
  .no b { display: block; font-size: 17px; color: #0b1b33; letter-spacing: 1px; }
  h1 { text-align: center; font-size: 20px; margin: 18px 0 4px; color: #0b1b33; }
  .sub { text-align: center; font-size: 12px; color: #6b7280; margin-bottom: 16px; }
  .pill { display: inline-block; padding: 4px 14px; border-radius: 999px; font-size: 12px; font-weight: 800;
          background: ${d?"#065f46":"#713f12"}; color: #fff; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
  th, td { border: 1px solid #d7dce5; padding: 9px 12px; text-align: right; }
  th { background: #f4f6fb; color: #0b1b33; width: 34%; font-weight: 800; }
  .clause { margin-top: 16px; font-size: 13px; line-height: 1.9; background: #fbf8ef; border: 1px dashed #c9a227;
            border-radius: 10px; padding: 12px 14px; }
  .sign { display: flex; gap: 18px; margin-top: 20px; align-items: flex-start; }
  .box { flex: 1; border: 1px solid #d7dce5; border-radius: 10px; padding: 10px; min-height: 110px; }
  .box h4 { margin: 0 0 6px; font-size: 12px; color: #6b7280; }
  .box img { max-width: 100%; max-height: 90px; }
  .stamp { text-align: center; border: 2px solid #059669; color: #059669; border-radius: 10px; padding: 10px;
           font-weight: 900; font-size: 13px; width: 210px; }
  footer { margin-top: 18px; border-top: 1px solid #d7dce5; padding-top: 10px; font-size: 11px; color: #6b7280;
           display: flex; justify-content: space-between; }
  @media print { .noprint { display: none !important; } .sheet { border: none; padding: 0; } }
  .noprint { text-align: center; margin: 16px 0; }
  .noprint button { background: #0b1b33; color: #fff; border: 0; border-radius: 10px; padding: 12px 28px;
                    font-size: 15px; font-weight: 800; cursor: pointer; }
</style>
</head>
<body>
<div class="sheet">
  <header>
    <div class="brand">ViP <span>Yemen</span> — منصة التوظيف والتسويق والعقار والبرمجيات</div>
    <div class="no">رقم السند<br><b>${y(s.receiptNo??"—")}</b></div>
  </header>
  <h1>${d?"سند دفع":"وثيقة توثيق إلكتروني"} ببصمة إلكترونية</h1>
  <div class="sub"><span class="pill">${ue[s.status]??s.status}</span></div>

  <table>
    <tr><th>المستفيد الكامل</th><td>${y(s.beneficiaryName)}</td></tr>
    <tr><th>رقم الهاتف</th><td dir="ltr">${y(s.phone)}</td></tr>
    <tr><th>موضوع الاتفاق</th><td>${y(s.title)}</td></tr>
    <tr><th>المبلغ المتفق عليه</th><td><b>${W(s.amount,s.currency)}</b></td></tr>
    <tr><th>عمولة المنصة</th><td><b>${W(s.commission,s.currency)}</b></td></tr>
    <tr><th>تاريخ التوقيع</th><td>${T(s.signedAt)}</td></tr>
    <tr><th>${d?"تاريخ التسديد":"حالة السند"}</th><td>${d?T(s.paidAt):"بانتظار التسديد"}</td></tr>
  </table>

  <div class="clause">
    يُقرّ ويتعهّد المستفيد أعلاه إقراراً نهائياً موثّقاً بالبصمة الإلكترونية والتوقيع الإلكتروني
    بالتزامه بتسديد المبلغ المتفق عليه أعلاه كعمولة للمنصة، ويُعدّ هذا السند وثيقة إثبات حق
    في مواجهة الطرفين والمنصة، موقّعة إلكترونياً عبر أنظمة المنصة الموثّقة.
  </div>

  <div class="sign">
    <div class="box">
      <h4>التوقيع الإلكتروني</h4>
      ${s.signature?`<img src="${s.signature}" alt="توقيع" />`:"—"}
      <div style="font-size:11px;color:#6b7280;margin-top:6px">
        ${s.signatureType==="drawn"?"مُرسَم على اللوحة":"مكتوب إلكترونياً"}
      </div>
    </div>
    <div class="box" style="display:flex;flex-direction:column;justify-content:space-between">
      <h4>البصمة الإلكترونية</h4>
      <div style="font-size:13px;font-weight:800">${x}</div>
      ${(t=s.fingerprint)!=null&&t.credentialId?`<div dir="ltr" style="font-size:10px;color:#6b7280;word-break:break-all">${y(s.fingerprint.credentialId.slice(0,48))}…</div>`:""}
      <div class="stamp">✔ موثّق بواسطة<br />منصة ViP Yemen</div>
    </div>
  </div>

  <footer>
    <span>vi-p-yemen.vercel.app · وثيقة مُولّدة آلياً من نظام التوثيق الإلكتروني</span>
    <span>أُنشئ: ${T(Date.now())}</span>
  </footer>
</div>
<div class="noprint"><button onclick="window.print()">🖨️ حفظ / طباعة سند الدفع (PDF)</button></div>
<script>window.onload = function () { setTimeout(function () { window.focus(); }, 300); };<\/script>
</body>
</html>`;r.document.open(),r.document.write(b),r.document.close()}function he({onChange:s}){const r=l.useRef(null),d=l.useRef(!1),x=l.useRef(!1),[b,f]=l.useState(!1);l.useEffect(()=>{const n=r.current;if(!n)return;const a=n.getContext("2d");if(!a)return;const o=window.devicePixelRatio||1,p=n.getBoundingClientRect();n.width=Math.max(1,Math.round(p.width*o)),n.height=Math.max(1,Math.round(p.height*o)),a.scale(o,o),a.lineWidth=2.2,a.lineCap="round",a.lineJoin="round",a.strokeStyle="#e7c66a",f(!0)},[]);function t(n){const o=r.current.getBoundingClientRect();return{x:n.clientX-o.left,y:n.clientY-o.top}}function j(n){var c;const a=(c=r.current)==null?void 0:c.getContext("2d");if(!a)return;d.current=!0,n.currentTarget.setPointerCapture(n.pointerId);const{x:o,y:p}=t(n);a.beginPath(),a.moveTo(o,p),a.lineTo(o+.01,p),a.stroke()}function $(n){var c;if(!d.current)return;const a=(c=r.current)==null?void 0:c.getContext("2d");if(!a)return;const{x:o,y:p}=t(n);a.lineTo(o,p),a.stroke()}function N(){var n;d.current&&(d.current=!1,x.current=!0,s(((n=r.current)==null?void 0:n.toDataURL("image/png"))??""))}function P(){const n=r.current,a=n==null?void 0:n.getContext("2d");!n||!a||(a.clearRect(0,0,n.width,n.height),x.current=!1,s(""))}return e.jsxs("div",{children:[e.jsx("div",{className:"rounded-xl border border-dashed border-gold-500/50 bg-ink-950/60 p-1",children:e.jsx("canvas",{ref:r,onPointerDown:j,onPointerMove:$,onPointerUp:N,onPointerLeave:N,className:"h-32 w-full touch-none rounded-lg"})}),e.jsxs("div",{className:"mt-1.5 flex items-center justify-between",children:[e.jsx("span",{className:"text-[11px] text-ink-400",children:b?"✍️ ارسم توقيعك داخل الإطار":"…"}),e.jsx("button",{type:"button",onClick:P,className:"text-[11px] font-bold text-rose-300 hover:text-rose-200",children:"مسح التوقيع"})]})]})}function we({token:s,open:r,onClose:d,matchTitle:x,requestName:b,requestPhone:f,contract:t,submissionId:j}){const $=S(k.contracts.createContract),N=S(k.contracts.createDraft),P=S(k.contracts.markPaid),n=S(k.contracts.voidContract),[a,o]=l.useState(""),[p,c]=l.useState(""),[E,F]=l.useState(""),[R,z]=l.useState(""),[H,U]=l.useState(""),[m,A]=l.useState(null),[M,B]=l.useState(null),[X,u]=l.useState(""),[I,h]=l.useState(!1),[Y,L]=l.useState(!1);l.useEffect(()=>{r&&(u(""),U(""),A(null),B(null),L(!1),o((t==null?void 0:t.beneficiaryName)||b||""),c((t==null?void 0:t.phone)||f||""),F(t?String(t.amount):""),z(t?String(t.commission):""))},[r,t==null?void 0:t._id,x,b,f]);const V=Number(E)||0,_=Number(R)||0,v=M?`${window.location.origin}${"/".replace(/\/$/,"")}/contract?t=${M}`:null;async function J(){u("");try{A(await xe())}catch(i){i instanceof O?u("هذا الجهاز لا يدعم ماسح البصمة — استخدم «تأكيد بديل مسجّل»."):u("لم يُؤكَّد البصمة — أعد المحاولة.")}}async function Q(){h(!0),u("");try{await $({token:s,matchId:t==null?void 0:t.matchId,submissionId:j??(t==null?void 0:t.submissionId),title:x,beneficiaryName:a,phone:p,amount:V,commission:_,signature:H,signatureType:"drawn",fingerprint:m??void 0}),d()}catch(i){u(i instanceof Error?i.message:String((i==null?void 0:i.data)??i))}finally{h(!1)}}async function q(){h(!0),u("");try{const i=await N({token:s,matchId:t==null?void 0:t.matchId,submissionId:j??(t==null?void 0:t.submissionId),title:x,beneficiaryName:a,phone:p,amount:V,commission:_});B(i.signToken)}catch(i){u(i instanceof Error?i.message:String((i==null?void 0:i.data)??i))}finally{h(!1)}}async function G(){if(v)try{await navigator.clipboard.writeText(v),L(!0),setTimeout(()=>L(!1),2e3)}catch{u("انسخ الرابط يدوياً: "+v)}}const Z=(t==null?void 0:t.status)==="paid"?"border-emerald-500/40 bg-emerald-500/10 text-emerald-300":(t==null?void 0:t.status)==="signed"?"border-gold-500/40 bg-gold-500/10 text-gold-300":(t==null?void 0:t.status)==="void"?"border-rose-500/40 bg-rose-500/10 text-rose-300":"border-amber-500/40 bg-amber-500/10 text-amber-300";return e.jsx(ee,{open:r,onClose:d,title:"📜 التوثيق الإلكتروني بالبصمة",wide:!0,children:e.jsxs("div",{className:"space-y-4",children:[e.jsxs("p",{className:"rounded-xl border border-ink-700/60 bg-ink-900/50 p-3 text-[12px] leading-relaxed text-ink-300",children:["يُستكمل هذا التوثيق داخل قائمة ",e.jsx("b",{className:"text-gold-300",children:"إتمام التوافق"})," قبل إتمام المطابقة وتسليم المستفيد — الاسم الكامل + الهاتف + التوقيع الإلكتروني + تأكيد البصمة + المبلغ المتفق عليه (يلتزم بتسديده عمولة للمنصة)، ويُصدر منه ",e.jsx("b",{className:"text-gold-300",children:"سند الدفع PDF"}),"."]}),t&&t.status!=="draft"?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"flex flex-wrap items-center gap-2",children:[e.jsx(K,{className:Z,children:t.receiptNo??"بلا رقم"}),e.jsx(K,{className:"border-ink-600/60 bg-ink-800/60 text-ink-200",children:t.status==="paid"?"مسدَّد":t.status==="signed"?"موقّع بالبصمة":t.status==="void"?"ملغى":"مسودة"})]}),e.jsxs("div",{className:"grid gap-2 rounded-xl border border-ink-700/60 p-3 text-[12px] sm:grid-cols-2",children:[e.jsxs("p",{children:[e.jsx("span",{className:"text-ink-400",children:"المستفيد:"})," ",e.jsx("b",{className:"text-cream",children:t.beneficiaryName||"—"})]}),e.jsxs("p",{children:[e.jsx("span",{className:"text-ink-400",children:"الهاتف:"})," ",e.jsx("b",{dir:"ltr",className:"text-cream",children:t.phone||"—"})]}),e.jsxs("p",{children:[e.jsx("span",{className:"text-ink-400",children:"المبلغ المتفق:"})," ",e.jsxs("b",{className:"text-gold-300",children:[t.amount," ",t.currency]})]}),e.jsxs("p",{children:[e.jsx("span",{className:"text-ink-400",children:"عمولة المنصة:"})," ",e.jsxs("b",{className:"text-gold-300",children:[t.commission," ",t.currency]})]})]}),t.signature&&e.jsxs("div",{className:"rounded-xl border border-ink-700/60 p-3",children:[e.jsx("p",{className:"mb-1 text-[11px] text-ink-400",children:"التوقيع الإلكتروني:"}),e.jsx("img",{src:t.signature,alt:"توقيع",className:"max-h-24"})]}),e.jsxs("div",{className:"flex flex-wrap gap-2",children:[e.jsxs(g,{variant:"gold",onClick:()=>me(t),children:[e.jsx(te,{className:"h-4 w-4"})," استخراج سند الدفع PDF"]}),t.status==="signed"&&e.jsxs(g,{variant:"success",loading:I,onClick:async()=>{h(!0);try{await P({token:s,id:t._id}),d()}finally{h(!1)}},children:[e.jsx(se,{className:"h-4 w-4"})," تسجيل كمُسدَّد"]}),t.status!=="void"&&e.jsxs(g,{variant:"danger",onClick:async()=>{if(confirm("إلغاء هذه الوثيقة نهائياً؟")){h(!0);try{await n({token:s,id:t._id}),d()}finally{h(!1)}}},children:[e.jsx(ie,{className:"h-4 w-4"})," إلغاء الوثيقة"]})]})]}):e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"grid gap-3 sm:grid-cols-2",children:[e.jsxs("div",{children:[e.jsx(w,{children:"الاسم الكامل للمستفيد"}),e.jsx(C,{value:a,onChange:i=>o(i.target.value),placeholder:"الاسم الثلاثي"})]}),e.jsxs("div",{children:[e.jsx(w,{children:"رقم الهاتف"}),e.jsx(C,{value:p,onChange:i=>c(i.target.value),dir:"ltr",placeholder:"7XXXXXXXX"})]}),e.jsxs("div",{children:[e.jsx(w,{children:"المبلغ المتفق عليه"}),e.jsx(C,{value:E,onChange:i=>{F(i.target.value),!R&&Number(i.target.value)>0&&z(String(Math.round(Number(i.target.value)*.1)))},type:"number",min:"0",dir:"ltr",placeholder:"0"})]}),e.jsxs("div",{children:[e.jsx(w,{children:"عمولة المنصة"}),e.jsx(C,{value:R,onChange:i=>z(i.target.value),type:"number",min:"0",dir:"ltr",placeholder:"0"})]})]}),e.jsxs("div",{children:[e.jsx(w,{children:"التوقيع الإلكتروني ✍️"}),e.jsx(he,{onChange:U})]}),e.jsxs("div",{className:"flex flex-wrap items-center gap-2",children:[e.jsxs(g,{variant:m?"success":"gold",onClick:J,type:"button",children:[e.jsx(ne,{className:"h-4 w-4"}),(m==null?void 0:m.mode)==="webauthn"?"البصمة موثّقة ✓":"تأكيد البصمة الإلكترونية"]}),!m&&e.jsx(g,{variant:"ghost",onClick:()=>A(D()),type:"button",children:"تأكيد بديل مسجّل"}),m&&e.jsx("span",{className:"text-[11px] text-emerald-300",children:m.mode==="webauthn"?"بصمة جهاز موثّقة (WebAuthn)":"مسار بديل مسجَّل في الوثيقة"})]}),X&&e.jsxs("p",{className:"flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-[12px] font-bold text-rose-300",children:[e.jsx(re,{className:"h-4 w-4 shrink-0"})," ",X]}),e.jsxs("div",{className:"flex flex-wrap gap-2",children:[e.jsxs(g,{variant:"gold",loading:I,onClick:Q,children:[e.jsx(ae,{className:"h-4 w-4"})," توقيع وتوثيق الآن"]}),e.jsxs(g,{variant:"ghost",loading:I,onClick:q,children:[e.jsx(de,{className:"h-4 w-4"})," رابط توقيع للمستفيد من جهازه"]})]}),v&&e.jsxs("div",{className:"rounded-xl border border-sky-500/30 bg-sky-500/10 p-3",children:[e.jsx("p",{className:"mb-2 text-[12px] text-sky-200",children:"أرسل هذا الرابط للمستفيد ليُكمل الاسم والتوقيع والبصمة من هاتفه، ثم تظهر الوثيقة هنا جاهزة لاستخراج سند الدفع:"}),e.jsxs("div",{className:"flex flex-wrap items-center gap-2",children:[e.jsx("code",{dir:"ltr",className:"min-w-0 flex-1 break-all rounded-lg bg-ink-950/70 p-2 text-[11px] text-sky-200",children:v}),e.jsxs(g,{variant:Y?"success":"ghost",onClick:G,children:[e.jsx(le,{className:"h-4 w-4"})," ",Y?"تم النسخ":"نسخ"]})]})]})]})]})})}export{we as C,O as F,he as S,xe as c,D as f,me as p};
