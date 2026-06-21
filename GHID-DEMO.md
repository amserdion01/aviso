# HydroKov — Ghid de demonstrație

**HydroKov** digitalizează procedura reală de **achiziție directă** a operatorului regional de apă:
înlocuiește circuitul pe hârtie (comandă internă / referat de necesitate cu semnături olografe) cu
un flux electronic, urmărit, pe roluri — cu istoric complet, notificări, documente PDF și interfață
bilingvă **română / maghiară**.

> **Adresă demo:** https://aviso-docs.vercel.app
> **Parolă (toate conturile):** `Parola123!`
>
> Date fictive, pentru demonstrație: ~10 referate în diverse stări (în curs la diferiți pași,
> aprobate, respinse, inițiate în SEAP), inclusiv câteva cu conținut în **limba maghiară**.

---

## Cuprins
1. [Limbă (RO / HU)](#1-limbă-ro--hu)
2. [Conturi](#2-conturi)
3. [Traseul de avizare HYDROKOV](#3-traseul-de-avizare-hydrokov)
4. [Funcționalitățile aplicației](#4-funcționalitățile-aplicației)
5. [Ce poți încerca (fluxuri recomandate)](#5-ce-poți-încerca-fluxuri-recomandate)

---

## 1. Limbă (RO / HU)
Aplicația este **bilingvă**. Schimbi limba din **meniul de utilizator** (dreapta sus) →
comutatorul **RO / HU**. Alegerea se **reține pe cont**, iar emailurile de notificare se trimit în
limba destinatarului. Tot ce ține de interfață este tradus (meniuri, formulare, statusuri, roluri,
documentul PDF). Conținutul introdus de utilizator (articol, justificare, comentarii) rămâne așa
cum a fost scris. Conturile `achizitii` și `coordachizitii` pornesc implicit pe **maghiară**.

---

## 2. Conturi

| Email | Rol | Ce poate face |
|---|---|---|
| `angajat@aviso.local` | **Angajat** (solicitant) | Întocmește comenzi interne / referate; își vede referatele și statusul lor |
| `sefbirou@aviso.local` | **Superior ierarhic** (al angajatului) | Avizează în inbox referatele subalternilor direcți |
| `sefserviciu@aviso.local` | **Superior ierarhic** (nivel superior) | Avizează ce vine de la șefii de birou |
| `achizitii@aviso.local` | **Birou Achiziții** *(implicit în maghiară)* | Stabilește valoarea și dacă produsul e în catalogul SEAP |
| `coordachizitii@aviso.local` | **Coordonator Achiziții** *(implicit în maghiară)* | Semnează comenzile externe (<5000 lei, fără SEAP) |
| `direconomic@aviso.local` | **Director Economic** | Semnătura economică (≥5000 lei / comandă externă) |
| `dirgeneral@aviso.local` | **Director General + Administrator** | Semnătura finală + acces la **Rapoarte** și **Administrare** |

> Avizarea de către „superiorul ierarhic" este **dinamică** — fiecare referat merge automat la
> superiorul direct al celui care l-a întocmit (din organigramă), nu la pași fixați.

---

## 3. Traseul de avizare HYDROKOV

```
Angajat (comandă internă / referat + notă justificativă)
   └─ Avizare superior ierarhic direct
        └─ Birou Achiziții — stabilește valoarea + dacă e în catalogul SEAP
             ├─ valoare ≥ 5000 lei            → Director Economic → Director General → APROBAT
             ├─ valoare < 5000 lei & în SEAP  → INIȚIAT ÎN SEAP (final, fără directori)
             └─ valoare < 5000 lei & fără SEAP → Coordonator Achiziții → Director Economic
                                                  → Director General → APROBAT (comandă externă)
```

- **Pragul de 5000 lei** este o constantă configurabilă.
- **Tipul documentului** (comandă internă vs referat) nu schimbă traseul — doar titlul documentului
  și forma (referatul cere notă justificativă, fiindcă nu e în PAAP).
- Valoarea finală și apartenența la SEAP **le stabilește Biroul Achiziții** în timpul fluxului;
  abia după aceea se decide ramura.

---

## 4. Funcționalitățile aplicației

### Documente & inițiere
- **Două tipuri de document, alese automat:** dacă articolul e în **PAAP** → *comandă internă*;
  dacă nu → *referat de necesitate* + **notă justificativă** obligatorie.
- **Estimare de valoare** la creare (orientativă) — valoarea oficială o pune Biroul Achiziții.

### Avizare & decizii
- **Avizare dinamică** de superiorul ierarhic direct (din organigramă).
- **Evaluare Birou Achiziții:** introduce valoarea calculată + răspunde „în catalogul SEAP?".
- **Ramificare automată** pe valoare/SEAP (vezi traseul de mai sus), inclusiv starea terminală
  **„Inițiat în SEAP"** și ramura de **comandă externă**.
- Fiecare aprobator poate **Aprobă / Respinge / Trimite înapoi** (comentariu obligatoriu la
  respingere și la trimitere înapoi).
- **Trimite înapoi flexibil** — la alegere:
  - la **pasul anterior** (implicit);
  - la **orice pas anterior** de pe traseu (se reia de acolo înainte);
  - la **solicitant, pentru corecții** → referatul intră în starea **„Returnat"**, solicitantul îl
    **editează și îl retrimite**, iar traseul reia de la început.
- **Înlocuitori / delegări:** un aprobator absent poate fi acoperit de un coleg, pe o perioadă, cu
  rutarea automată a taskurilor către înlocuitor (cu păstrarea în audit a cine a acționat).

### Vizibilitate & colaborare
- **Inboxul meu** — referatele care îți așteaptă decizia, cu acțiuni rapide din listă.
- **Toate referatele** — vedere de ansamblu; administratorii și directorii văd toată organizația.
- **Căutare** — în referatele în care ești implicat (articol, centru de cost, solicitant, ID).
- **Notificări** (clopoțelul) — actualizări la referatele tale + cele care îți așteaptă avizul;
  emailuri trimise în limba destinatarului.
- **Discuție / comentarii** pe fiecare referat.
- **Istoric & audit** — jurnal append-only al fiecărei acțiuni (cine, ce, când, cu ce comentariu).

### Document oficial
- **PDF / document tipăribil** generat doar la stare finală (**Aprobat** sau **Inițiat în SEAP**),
  cu titlul corect („Comandă internă" / „Referat de necesitate") și nota justificativă unde e cazul.

### Administrare & rapoarte (Director General / Administrator)
- **Rapoarte** — total referate, finalizate (inclusiv inițiate în SEAP), valoare, timp mediu de
  avizare, coada pe fiecare pas, cheltuieli pe centru de cost.
- **Administrare** → **Utilizatori & roluri** (creare/editare conturi, activare/dezactivare),
  **Delegări / înlocuitori**, **Flux de avizare** (categorii și pașii lor).

### Securitate & limbă
- Autorizare **per-task**: un aprobator acționează doar pe ce îi este rutat (direct sau prin
  delegare activă) — rolul singur nu e suficient.
- Conturile dezactivate sunt blocate imediat. Interfață integral **RO + HU**.

---

## 5. Ce poți încerca (fluxuri recomandate)

### A. Solicitant → trimitere
1. Autentifică-te cu **`angajat@aviso.local`** → **Referat nou**.
2. Completează articol, cantitate, centru de cost, justificare.
   - Lasă **„în PAAP" debifat** → apare **Nota justificativă** (obligatorie) → *referat de necesitate*.
   - Bifează **„în PAAP"** → devine *comandă internă*.
3. **Trimite** → intră la avizarea superiorului tău direct.

### B. Avizare + evaluare → ramificarea
1. **`sefbirou@aviso.local`** → în inbox găsești referatul → **Aprobă**.
2. **`achizitii@aviso.local`** (UI în maghiară) → la pasul **Birou Achiziții** introdu **valoarea**
   și răspunde **„în SEAP? (da/nu)"**:
   - `< 5000 + SEAP=da` → **Inițiat în SEAP** (final);
   - `≥ 5000` → **Director Economic** → **Director General**;
   - `< 5000 + SEAP=nu` → **Coordonator Achiziții** → directori (comandă externă).
3. Continuă cu `direconomic` / `dirgeneral` (și `coordachizitii` la comanda externă) pentru semnături.

### C. Trimite înapoi (cele 3 variante)
La orice pas, alege **Trimite înapoi** și apoi ținta:
- **Pasul anterior** — corecție rapidă, un pas în urmă.
- **Orice pas anterior** — alegi din listă; traseul se reia de acolo.
- **Solicitant (pentru corecții)** — referatul devine **„Returnat"**; loghează-te ca
  **`angajat@aviso.local`**, vezi bannerul **„Editează și retrimite"**, modifică și retrimite —
  fluxul reia de la capăt.

### D. Document final
Pe un referat **Aprobat** sau **Inițiat în SEAP** → **PDF / Descarcă** → se deschide documentul
oficial (salvează-l ca PDF din dialogul de print al browserului).

### E. Rapoarte & Administrare
Autentifică-te cu **`dirgeneral@aviso.local`** → **Rapoarte** (indicatori) și **Administrare**
(utilizatori, delegări, flux de avizare).

---

*Notă: în mediul demo emailurile nu se trimit către inboxuri reale; notificările apar în aplicație
(clopoțelul, dreapta sus).*
