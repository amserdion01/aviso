# HydroKov — Ghid de demonstrație

**HydroKov** digitalizează procedura reală de **achiziție directă** a operatorului de apă:
un angajat întocmește un document (**comandă internă** dacă articolul e în PAAP, altfel
**referat de necesitate** + notă justificativă), acesta este **avizat de superiorul ierarhic
direct**, apoi ajunge la **Biroul Achiziții**, care stabilește **valoarea** și dacă produsul e în
**catalogul SEAP**. În funcție de valoare și SEAP, traseul se ramifică automat. Fiecare aprobator
poate **Aprobă / Respinge / Trimite înapoi**, totul cu istoric/audit, iar la final documentul se
poate salva ca PDF.

> **Adresă demo:** https://aviso-docs.vercel.app
> **Parolă (toate conturile):** `Parola123!`
>
> Date fictive: **10 referate** în toate stările (în curs la diferiți pași, aprobate, respinse,
> **inițiate în SEAP**), inclusiv câteva cu conținut în **limba maghiară**.

> **Limbă: română / maghiară.** Aplicația e bilingvă. Schimbi limba din **meniul de utilizator**
> (dreapta sus) → comutatorul **RO / HU**; alegerea se reține pe cont, iar emailurile de notificare
> se trimit în limba destinatarului. Conturile `achizitii` și `coordachizitii` sunt implicit pe
> **maghiară** (poți comuta oricând pe RO).

---

## Traseul de avizare (HYDROKOV)

```
Angajat (comandă internă / referat + notă)
   └─ Avizare superior ierarhic direct
        └─ Birou Achiziții — stabilește valoarea + dacă e în catalogul SEAP
             ├─ valoare ≥ 5000 lei            → Director Economic → Director General → APROBAT
             ├─ valoare < 5000 lei & în SEAP  → INIȚIAT ÎN SEAP (final, fără directori)
             └─ valoare < 5000 lei & fără SEAP → Coordonator Achiziții → Director Economic
                                                  → Director General → APROBAT (comandă externă)
```

Pragul (5000 lei) este o constantă configurabilă. Tipul documentului (comandă internă vs referat)
nu schimbă traseul — doar titlul documentului și forma (referatul cere notă justificativă).

---

## Conturi

| Email | Rol | Ce vezi / ce poți face |
|---|---|---|
| `angajat@aviso.local` | **Angajat** (solicitant) | Creează comenzi/referate; vede „Toate referatele" |
| `sefbirou@aviso.local` | **Superior ierarhic** (al angajatului) | Avizează referatele subalternilor în inbox |
| `sefserviciu@aviso.local` | **Superior ierarhic** (nivel superior) | Avizează ce vine de la șefii de birou |
| `achizitii@aviso.local` | **Birou Achiziții** *(implicit în maghiară)* | Stabilește valoarea + SEAP la pasul de evaluare |
| `coordachizitii@aviso.local` | **Coordonator Achiziții** *(implicit în maghiară)* | Semnează comenzile externe (<5000 fără SEAP) |
| `direconomic@aviso.local` | **Director Economic** | Semnătura economică (≥5000 / comandă externă) |
| `dirgeneral@aviso.local` | **Director General + Administrator** | Semnătura finală, plus **Administrare** și **Rapoarte** |

---

## Ce poți încerca (flux recomandat)

### 1. Solicitant
1. Autentifică-te cu **`angajat@aviso.local`**.
2. **Referat nou** — completează articol, cantitate, centru de cost, justificare.
   - Lasă **„în PAAP" debifat** → apare câmpul **Notă justificativă** (obligatoriu) și documentul devine
     **referat de necesitate**. Bifează „în PAAP" → devine **comandă internă**.
   - Valoarea introdusă e doar o estimare; valoarea finală o stabilește Biroul Achiziții.
3. **Trimite referatul** → intră la avizarea superiorului tău direct.

### 2. Avizare superior + evaluare Achiziții (ramificarea)
1. Autentifică-te cu **`sefbirou@aviso.local`** → în inbox găsești referatul angajatului → **Aprobă**.
2. Autentifică-te cu **`achizitii@aviso.local`** (UI în maghiară). La pasul **Birou Achiziții** introduci
   **valoarea calculată (lei)** și răspunzi **„în catalogul SEAP? (da/nu)"**, apoi aprobi. În funcție de
   ce alegi:
   - **valoare < 5000 + SEAP = da** → referatul devine **„Inițiat în SEAP"** (final, fără directori);
   - **valoare ≥ 5000** → merge la **Director Economic** apoi **Director General**;
   - **valoare < 5000 + SEAP = nu** → merge la **Coordonator Achiziții** (comandă externă) apoi directori.
3. Continuă cu `direconomic` / `dirgeneral` (sau `coordachizitii` pentru comanda externă) pentru semnături.

La **respingere / trimitere înapoi** comentariul (motivul) e obligatoriu.

### 3. Document final (PDF)
Pe un referat **Aprobat** sau **Inițiat în SEAP**, apasă **PDF / Descarcă** — se generează documentul
oficial (titlu „Comandă internă" sau „Referat de necesitate", cu nota justificativă unde e cazul).

### 4. Rapoarte & Administrare (`dirgeneral@aviso.local`)
- **Rapoarte** — total, finalizate (inclusiv inițiate în SEAP), valoare, timp mediu, coada pe pas,
  cheltuieli pe centru de cost.
- **Administrare** — utilizatori & roluri, delegări/înlocuitori, și fluxul de avizare.

---

*Notă: emailurile nu sunt trimise în mediul demo; notificările apar în aplicație (clopoțelul).*
