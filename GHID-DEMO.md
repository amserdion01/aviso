# Aviso — Ghid de demonstrație

**Aviso** digitalizează fluxul de aprobare a *referatelor de necesitate* la Apa Covasna:
un angajat trimite un referat, acesta parcurge un traseu de avizare pe roluri, iar fiecare
aprobator poate **Aprobă**, **Respinge** sau **Trimite înapoi** din inboxul propriu. Toate
acțiunile sunt înregistrate într-un istoric/audit, iar la final se generează PDF-ul oficial.

> **Adresă demo:** `https://<adresa-ta>.vercel.app`
> **Parolă (pentru toate conturile):** `Parola123!`
>
> Datele sunt fictive, pentru demonstrație. Te poți autentifica cu oricare cont de mai jos.

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

Traseul complet de avizare: **Șef birou → Șef serviciu → Înregistrare → IT* → SSM* → RU → Magazie → Director economic → Achiziții (încadrare) → Achiziții/Aprovizionare/Servicii → Director**
(*) pașii IT și SSM apar doar dacă referatul îi solicită.

---

## Ce poți încerca (flux recomandat)

### 1. Perspectiva solicitantului
1. Autentifică-te cu **`angajat@aviso.local`**.
2. **Toate referatele** — vezi referatele existente cu statusuri diferite: `În curs`, `Finalizat`, `Respins`.
3. **Referat nou** — completează un articol, cantitate, centru de cost și justificare, apoi **Trimite referatul**. Vei vedea o confirmare, iar referatul intră pe traseu.
4. Deschide un referat → vezi **traseul de avizare** (stepper), **datele**, **istoricul/audit** și secțiunea de **discuție** (comentarii).

### 2. Perspectiva aprobatorului (inbox + acțiuni)
Fiecare cont de aprobator are deja un referat care îi așteaptă decizia:

| Autentifică-te cu | În inbox găsești |
|---|---|
| `sefbirou@aviso.local` | „Reactivi laborator (set complet)" |
| `it@aviso.local` | „Switch-uri rețea Cisco Catalyst 1300" |
| `magazie@aviso.local` | „Pompă submersibilă Grundfos SP 17-7" |
| `direconomic@aviso.local` | „Imprimantă multifuncțională Xerox" |
| `sefserviciu@aviso.local` | „Scaune ergonomice birou" (a fost **trimis înapoi** cu observații) |

În **Inboxul meu** poți, direct din listă: **Aprobă** (avansează la pasul următor), **Trimite înapoi** sau **Respinge**.
La respingere / trimitere înapoi este obligatoriu un comentariu (motivul). Încearcă să aprobi un referat și urmărește cum dispare din inbox și avansează pe traseu.

### 3. Notificări, căutare, comentarii
- **Clopoțelul** (sus-dreapta) arată notificările: actualizări la referatele tale (ca solicitant) și referate care îți așteaptă avizul (ca aprobator).
- **Căutarea** (bara de sus) caută în referatele în care ești implicat — după articol, centru de cost, solicitant sau ID.
- Pe pagina unui referat, secțiunea **Discuție** permite comentarii (vezi exemplele de la „Laptop Dell Latitude 5540").

### 4. Achiziții + PDF
1. Autentifică-te cu **`achizitii@aviso.local`** (sau `dirgeneral@aviso.local`).
2. **Achiziții** — lista referatelor avizate complet (Laptop Dell, Monitor Dell), cu valori și totaluri.
3. Apasă **PDF** pe un referat finalizat — se generează documentul oficial.

### 5. Rapoarte (manager)
Autentifică-te cu **`dirgeneral@aviso.local`** → **Rapoarte**: total referate, finalizate, valoare, timp mediu de avizare, coada pe fiecare pas și cheltuieli pe centru de cost.

### 6. Administrare (doar Administrator)
Cu **`dirgeneral@aviso.local`** → **Administrare**:
- **Utilizatori & roluri** — adaugă utilizatori, editează rolurile, activează/dezactivează conturi.
- **Delegări / înlocuitori** — desemnează un înlocuitor pentru o perioadă.
- **Flux de avizare** — editează pașii traseului (adaugă/șterge/reordonează, condiții). Modificările se aplică doar referatelor viitoare.

---

*Notă: emailurile nu sunt trimise în mediul demo; notificările apar în aplicație (clopoțelul).*
