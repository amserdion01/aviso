# HydroKov — Bemutató útmutató

A **HydroKov** a regionális vízszolgáltató valós **közvetlen beszerzési** eljárását digitalizálja:
a papíralapú folyamatot (belső megrendelés / saját kezű aláírásokkal ellátott szükségességi
referátum) egy elektronikus, nyomon követett, szerepkör-alapú folyamattal váltja ki — teljes
előzménytörténettel, értesítésekkel, PDF-dokumentumokkal és kétnyelvű **román / magyar**
felülettel.

> **Bemutató cím:** https://aviso-docs.vercel.app
> **Jelszó (minden fiókhoz):** `Parola123!`
>
> Fiktív, bemutató célú adatok: **16 referátum** különböző állapotokban (különböző lépéseknél
> folyamatban, jóváhagyva, elutasítva, **SEAP-ben kezdeményezve**, **az igénylőnek visszaküldve**),
> köztük néhány **magyar nyelvű** tartalommal.
>
> A jelen útmutató román nyelvű változata: [`GHID-DEMO.md`](./GHID-DEMO.md).

---

## Tartalomjegyzék
1. [Nyelv (RO / HU)](#1-nyelv-ro--hu)
2. [Fiókok](#2-fiókok)
3. [A HYDROKOV jóváhagyási útvonala](#3-a-hydrokov-jóváhagyási-útvonala)
4. [Az alkalmazás funkciói](#4-az-alkalmazás-funkciói)
5. [Mit próbálhat ki (ajánlott folyamatok)](#5-mit-próbálhat-ki-ajánlott-folyamatok)

---

## 1. Nyelv (RO / HU)
Az alkalmazás **kétnyelvű**. A nyelvet a **felhasználói menüből** (jobb felső sarok) →
a **RO / HU** kapcsolóval lehet módosítani. A választás **fiókonként megőrződik**, az értesítő
e-mailek pedig a címzett nyelvén kerülnek kiküldésre. A felülethez tartozó minden elem le van
fordítva (menük, űrlapok, állapotok, szerepkörök, PDF-dokumentum). A felhasználó által bevitt
tartalom (tétel, indoklás, megjegyzések) úgy marad, ahogyan azt megírták. Az `achizitii` és a
`coordachizitii` fiók alapértelmezetten **magyar** nyelven indul.

---

## 2. Fiókok

| Email | Szerepkör | Mit tud csinálni |
|---|---|---|
| `angajat@aviso.local` | **Alkalmazott** (igénylő) | Belső megrendeléseket / referátumokat állít össze; látja saját referátumait és azok állapotát |
| `sefbirou@aviso.local` | **Közvetlen felettes** (az alkalmazotté) | A beérkezett feladatok között jóváhagyja a közvetlen beosztottak referátumait |
| `sefserviciu@aviso.local` | **Közvetlen felettes** (magasabb szint) | Jóváhagyja az irodavezetőktől érkező referátumokat |
| `achizitii@aviso.local` | **Beszerzési iroda** *(alapértelmezetten magyarul)* | Megállapítja az értéket és azt, hogy a termék szerepel-e a SEAP-katalógusban |
| `coordachizitii@aviso.local` | **Beszerzési koordinátor** *(alapértelmezetten magyarul)* | Aláírja a külső megrendeléseket (<5000 lej, SEAP nélkül) |
| `direconomic@aviso.local` | **Gazdasági igazgató** | Gazdasági aláírás (≥5000 lej / külső megrendelés) |
| `dirgeneral@aviso.local` | **Vezérigazgató + Adminisztrátor** | Végső aláírás + hozzáférés a **Jelentésekhez** és az **Adminisztrációhoz** |

> A „közvetlen felettes" általi jóváhagyás **dinamikus** — minden referátum automatikusan annak a
> személynek a közvetlen feletteséhez kerül (a szervezeti ábra alapján), aki összeállította, nem
> pedig rögzített lépésekhez.

---

## 3. A HYDROKOV jóváhagyási útvonala

```
Alkalmazott (belső megrendelés / referátum + indoklási megjegyzés)
   └─ Közvetlen felettes jóváhagyása
        └─ Beszerzési iroda — megállapítja az értéket + azt, hogy szerepel-e a SEAP-katalógusban
             ├─ érték ≥ 5000 lej               → Gazdasági igazgató → Vezérigazgató → JÓVÁHAGYVA
             ├─ érték < 5000 lej & SEAP-ban     → SEAP-BEN KEZDEMÉNYEZVE (végleges, igazgatók nélkül)
             └─ érték < 5000 lej & SEAP nélkül  → Beszerzési koordinátor → Gazdasági igazgató
                                                  → Vezérigazgató → JÓVÁHAGYVA (külső megrendelés)
```

- Az **5000 lejes küszöbérték** egy konfigurálható állandó.
- A **dokumentum típusa** (belső megrendelés vs. referátum) nem változtatja meg az útvonalat — csak
  a dokumentum címét és formáját (a referátum indoklási megjegyzést igényel, mivel nem szerepel a
  PAAP-ban).
- A végső értéket és a SEAP-hoz tartozást **a Beszerzési iroda állapítja meg** a folyamat során;
  az elágazásról csak ezután születik döntés.

---

## 4. Az alkalmazás funkciói

### Dokumentumok és kezdeményezés
- **Két dokumentumtípus, automatikusan kiválasztva:** ha a tétel szerepel a **PAAP**-ban → *belső
  megrendelés*; ha nem → *szükségességi referátum* + kötelező **indoklási megjegyzés**.
- **Értékbecslés** a létrehozáskor (tájékoztató jellegű) — a hivatalos értéket a Beszerzési iroda
  adja meg.

### Jóváhagyás és döntések
- **Dinamikus jóváhagyás** a közvetlen felettes által (a szervezeti ábra alapján).
- **Beszerzési iroda értékelése:** beviszi a kiszámított értéket + megválaszolja, hogy „szerepel-e a
  SEAP-katalógusban?".
- **Automatikus elágazás** érték/SEAP alapján (lásd a fenti útvonalat), beleértve a **„SEAP-ben
  kezdeményezve"** végállapotot és a **külső megrendelés** ágat.
- Minden jóváhagyó **Jóváhagyás / Elutasítás / Visszaküldés** műveletet végezhet (elutasításnál és
  visszaküldésnél a megjegyzés kötelező).
- **Rugalmas visszaküldés** — választható módon:
  - az **előző lépéshez** (alapértelmezett);
  - az útvonal **bármely korábbi lépéséhez** (onnan folytatódik előrefelé);
  - **az igénylőnek, javítás céljából** → a referátum **„Visszaküldve"** állapotba kerül, az igénylő
    **szerkeszti és újraküldi**, az útvonal pedig elölről indul.
- **Helyettesítések:** egy hiányzó jóváhagyót egy kolléga helyettesíthet egy adott időszakra, a
  feladatok automatikus átirányításával a helyetteshez (az auditban megőrizve, hogy ki járt el).

### Láthatóság és együttműködés
- **Beérkezett feladataim** — a döntésére váró referátumok, gyors műveletekkel a listából.
- **Összes referátum** — összesítő nézet; az adminisztrátorok és az igazgatók az egész szervezetet
  látják.
- **Keresés** — azokban a referátumokban, amelyekben érintett (tétel, költséghely, igénylő, azonosító).
- **Értesítések** (csengő) — frissítések a saját referátumairól + azokról, amelyek a jóváhagyására
  várnak; az e-mailek a címzett nyelvén kerülnek kiküldésre.
- **Megbeszélés / megjegyzések** minden referátumon.
- **Előzmények és audit** — minden művelet csak hozzáfűzhető (append-only) naplója (ki, mit, mikor,
  milyen megjegyzéssel).

### Hivatalos dokumentum
- **PDF / nyomtatható dokumentum**, amely csak végállapotban (**Jóváhagyva** vagy **SEAP-ben
  kezdeményezve**) generálódik, a megfelelő címmel („Belső megrendelés" / „Szükségességi
  referátum") és — ahol szükséges — az indoklási megjegyzéssel.

### Adminisztráció és jelentések (Vezérigazgató / Adminisztrátor)
- **Jelentések** — referátumok összesen, lezárva (beleértve a SEAP-ben kezdeményezetteket is),
  érték, átlagos jóváhagyási idő, várólista lépésenként, kiadások költséghelyenként.
- **Adminisztráció** → **Felhasználók és szerepkörök** (fiókok létrehozása/szerkesztése,
  aktiválás/deaktiválás), **Helyettesítések**, **Jóváhagyási folyamat** (kategóriák és azok lépései).

### Biztonság és nyelv
- **Feladatonkénti** jogosultság: egy jóváhagyó csak azon járhat el, ami hozzá van irányítva
  (közvetlenül vagy aktív helyettesítés útján) — önmagában a szerepkör nem elegendő.
- A deaktivált fiókok azonnal zárolódnak. A felület teljes egészében **RO + HU**.

---

## 5. Mit próbálhat ki (ajánlott folyamatok)

### A. Igénylő → beküldés
1. Jelentkezzen be az **`angajat@aviso.local`** fiókkal → **Új referátum**.
2. Töltse ki a tételt, mennyiséget, költséghelyet, indoklást.
   - Hagyja a **„PAAP-ban" jelölőt kipipálatlanul** → megjelenik az **Indoklási megjegyzés**
     (kötelező) → *szükségességi referátum*.
   - Pipálja be a **„PAAP-ban" jelölőt** → *belső megrendelés* lesz belőle.
3. **Beküldés** → a közvetlen felettese jóváhagyásához kerül.

### B. Jóváhagyás + értékelés → elágazás
1. **`sefbirou@aviso.local`** → a beérkezett feladatok között megtalálja a referátumot →
   **Jóváhagyás**.
2. **`achizitii@aviso.local`** (magyar nyelvű felület) → a **Beszerzési iroda** lépésnél vigye be az
   **értéket** és válaszoljon a **„SEAP-ban? (igen/nem)"** kérdésre:
   - `< 5000 + SEAP=igen` → **SEAP-ben kezdeményezve** (végleges);
   - `≥ 5000` → **Gazdasági igazgató** → **Vezérigazgató**;
   - `< 5000 + SEAP=nem` → **Beszerzési koordinátor** → igazgatók (külső megrendelés).
3. Folytassa a `direconomic` / `dirgeneral` (külső megrendelésnél a `coordachizitii` is) fiókokkal az
   aláírásokhoz.

### C. Visszaküldés (a 3 változat)
Bármely lépésnél válassza a **Visszaküldés** lehetőséget, majd a célt:
- **Előző lépés** — gyors javítás, egy lépéssel visszább.
- **Bármely korábbi lépés** — a listából választhat; az útvonal onnan folytatódik.
- **Igénylő (javítás céljából)** — a referátum **„Visszaküldve"** állapotba kerül; jelentkezzen be
  **`angajat@aviso.local`** néven, nézze meg a **„Szerkeszd és küldd újra"** szalagcímet,
  módosítsa és küldje újra — a folyamat elölről indul.

### D. Végső dokumentum
Egy **Jóváhagyva** vagy **SEAP-ben kezdeményezve** állapotú referátumon → **PDF / Letöltés** →
megnyílik a hivatalos dokumentum (mentse el PDF-ként a böngésző nyomtatási párbeszédablakából).

### E. Jelentések és Adminisztráció
Jelentkezzen be a **`dirgeneral@aviso.local`** fiókkal → **Jelentések** (mutatószámok) és
**Adminisztráció** (felhasználók, helyettesítések, jóváhagyási folyamat).

---

*Megjegyzés: a bemutató környezetben az e-mailek nem kerülnek kiküldésre valós postafiókokba; az
értesítések az alkalmazásban jelennek meg (csengő, jobb felső sarok).*
