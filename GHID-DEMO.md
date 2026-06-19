# HydroKov — Ghid de demonstrație

**HydroKov** digitalizează fluxul de aprobare a *referatelor de necesitate* la Apa Covasna:
un angajat alege o **categorie** de referat și îl trimite, acesta parcurge traseul de avizare
al categoriei, iar fiecare aprobator poate **Aprobă**, **Respinge** sau **Trimite înapoi** din
inboxul propriu. Toate acțiunile sunt înregistrate într-un istoric/audit, iar la final
documentul oficial se poate salva ca PDF.

> **Adresă demo:** https://aviso-docs.vercel.app
> **Parolă (pentru toate conturile):** `Parola123!`
>
> Datele sunt fictive, pentru demonstrație: **14 referate** în **4 categorii**, în toate stările
> (finalizate, în curs la diferiți pași, respinse, trimise înapoi). Te poți autentifica cu oricare
> cont de mai jos.

---

## Conturi

| Email | Rol în aplicație | Ce vezi / ce poți face |
|---|---|---|
| `angajat@aviso.local` | **Angajat** (solicitant) | Creează referate; vede „Toate referatele" cu statusul lor |
| `sefbirou@aviso.local` | **Șef birou** | Primul pas de avizare în inbox |
| `sefserviciu@aviso.local` | **Șef serviciu** | Al doilea pas de avizare |
| `secretariat@aviso.local` | **Secretariat** (înregistrare) | Pasul de înregistrare |
| `it@aviso.local` | **IT** | Avizează referatele care necesită aviz IT |
| `ssm@aviso.local` | **SSM** | Avizează referatele care necesită aviz SSM |
| `ru@aviso.local` | **Resurse umane** | Pasul RU |
| `magazie@aviso.local` | **Magazie** | Verificare stoc magazie |
| `direconomic@aviso.local` | **Director economic** | Aprobare economică |
| `achizitii@aviso.local` | **Achiziții** | Încadrare + achiziții |
| `aprovizionare@aviso.local` | **Aprovizionare** | Ramura aprovizionare |
| `servicii@aviso.local` | **Servicii** | Ramura servicii |
| `dirtehnic@aviso.local` | **Director tehnic** | Aprobarea finală de director |
| `dirgeneral@aviso.local` | **Director general + Administrator** | Tot, plus **Administrare** și **Rapoarte** |

---

## Categorii de flux (traseu de avizare)

Fiecare referat aparține unei **categorii**, care îi dictează traseul. Categoriile pre-create:

| Categorie | Traseu |
|---|---|
| **Standard** | Șef birou → Șef serviciu → Înregistrare → IT* → SSM* → RU → Magazie → Director economic → Achiziții (încadrare) → Achiziții/Aprovizionare/Servicii → Director |
| **Achiziții mici** | Șef birou → Director economic → Achiziții |
| **Servicii IT** | Șef birou → IT → Director economic → Achiziții |
| **Reparații urgente** | Șef serviciu → Director |

(*) la „Standard", pașii IT și SSM apar doar dacă referatul îi solicită.
Un **administrator** poate crea/edita categorii și pașii lor din **Administrare → Flux de avizare**.

---

## Ce poți încerca (flux recomandat)

### 1. Perspectiva solicitantului
1. Autentifică-te cu **`angajat@aviso.local`**.
2. **Toate referatele** — vezi referatele tale cu statusuri diferite: `În curs`, `Finalizat`, `Respins`. *(Un admin/director vede aici referatele din întreaga organizație, cu coloana Solicitant.)*
3. **Referat nou** — alege întâi **categoria** (ex. „Standard" sau „Achiziții mici"), apoi completează articol, cantitate, centru de cost și justificare → **Trimite referatul**. Categoria aleasă determină traseul.
4. Deschide un referat → vezi **traseul de avizare** (stepper), **datele**, **istoricul/audit** și secțiunea de **discuție** (comentarii).

### 2. Perspectiva aprobatorului (inbox + acțiuni)
Fiecare cont de aprobator are deja referate care îi așteaptă decizia (în paranteză, categoria):

| Autentifică-te cu | În „Inboxul meu" găsești |
|---|---|
| `sefbirou@aviso.local` | „Reactivi laborator" *(Standard)* |
| `sefserviciu@aviso.local` | „Scaune ergonomice birou" *(Standard, a fost **trimis înapoi**)* |
| `it@aviso.local` | „Switch-uri Cisco" *(Standard)* + „Abonament VPN" *(Servicii IT)* |
| `magazie@aviso.local` | „Pompă Grundfos" *(Standard)* |
| `direconomic@aviso.local` | „Imprimantă Xerox" *(Standard)* + „Tonere HP" *(Achiziții mici)* |
| `dirtehnic@aviso.local` | „Înlocuire motor electric" *(Reparații urgente)* |

În **Inboxul meu** poți, direct din listă: **Aprobă** (avansează la pasul următor), **Trimite înapoi** sau **Respinge**.
La respingere / trimitere înapoi este obligatoriu un comentariu (motivul). Încearcă să aprobi un referat și urmărește cum dispare din inbox și avansează pe traseu.

### 3. Notificări, căutare, comentarii
- **Clopoțelul** (sus-dreapta) arată notificările: actualizări la referatele tale (ca solicitant) și referate care îți așteaptă avizul (ca aprobator).
- **Căutarea** (bara de sus) caută în referatele în care ești implicat — după articol, centru de cost, solicitant sau ID.
- Pe pagina unui referat, secțiunea **Discuție** permite comentarii (vezi exemplele de la „Laptop Dell Latitude 5540").

### 4. Achiziții + PDF
1. Autentifică-te cu **`achizitii@aviso.local`** (sau `dirgeneral@aviso.local`).
2. **Achiziții** — lista referatelor avizate complet (5 referate din mai multe categorii), cu valori și totaluri.
3. Apasă **PDF** pe un referat finalizat — se deschide documentul oficial; salvează-l ca PDF din dialogul de tipărire al browserului.

### 5. Rapoarte (manager)
Autentifică-te cu **`dirgeneral@aviso.local`** → **Rapoarte**: total referate, finalizate, valoare, timp mediu de avizare, coada pe fiecare pas și cheltuieli pe centru de cost.

### 6. Administrare (doar Administrator)
Cu **`dirgeneral@aviso.local`** → **Administrare**:
- **Utilizatori & roluri** — adaugă utilizatori, editează rolurile, activează/dezactivează conturi.
- **Delegări / înlocuitori** — desemnează un înlocuitor pentru o perioadă.
- **Flux de avizare** — gestionează **categoriile**: adaugă o categorie nouă, redenumește, (dez)activează, și editează pașii fiecăreia (adaugă/șterge/reordonează, capabilitate, condiții). Modificările se aplică doar referatelor viitoare. *Încearcă: creează o categorie nouă și adaugă-i 2-3 pași.*

---

*Notă: emailurile nu sunt trimise în mediul demo; notificările apar în aplicație (clopoțelul).*
