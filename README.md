# HUD - resursa FiveM cu interfata NUI

Autor: jetmir

HUD in HTML/CSS/JS pur, fara framework-uri si fara dependente externe.

- **In browser** (`ui/index.html`) ruleaza un **demo animat**, cu date simulate.
- **In FiveM** primeste datele reale din `client.lua` prin `SendNUIMessage`.

> **Testat:** partea de UI (mesajele `hud:update` / `hud:notify`) a fost verificata intr-un browser.
> `client.lua`, `server.lua` si integrarea cu vRP **nu au fost rulate pe un server FiveM** -
> testeaza-le si adapteaza-le (mai ales combustibil, nitro si foame/sete).

---

## Instalare

1. Pune folderul `hud` in `resources/` (numele folderului = numele resursei).
2. In `server.cfg`: `ensure hud`
3. Porneste serverul. HUD-ul apare singur la intrarea in joc.

## Structura folderului

```
hud/
├─ fxmanifest.lua   declara pagina NUI si scripturile
├─ client.lua       citeste datele din joc si le trimite spre UI
├─ server.lua       trimite numarul de jucatori online
├─ README.md
└─ ui/
   ├─ index.html    structura HUD-ului (toate elementele)
   ├─ style.css     aspect, pozitii, animatii, fonturi
   ├─ script.js     logica de desenare + asculta mesajele din Lua
   └─ assets/       logo.png, gift.png, bg.webp (doar demo), fonts/*.woff2
```

---

## Cum circula datele

```
joc (natives, vRP) -> client.lua -> SendNUIMessage({type=...}) -> script.js -> ecran
```

`script.js` primeste mesajul, valideaza valorile (tipuri, limite) si le scrie in
obiectul `car`. Functia `draw()` citeste `car` si actualizeaza ecranul.
Cand vine primul `hud:update`, demo-ul simulat se opreste automat.

---

## Mesaje NUI (Lua -> JS)

Toate se trimit cu `SendNUIMessage` din Lua. Campurile necunoscute sau cu tip gresit sunt ignorate.

### 1. `hud:update` - date live (cel mai folosit)

Poti trimite **doar campurile care s-au schimbat**.

```lua
SendNUIMessage({
  type = 'hud:update',
  speed = 132.0,        -- km/h
  gear = 3,             -- 1-5 sau 'R'
  rpm = 0.55,           -- 0.0 - 1.0
  fuel = 0.40,          -- 0.0 - 1.0
  inVehicle = true,     -- false ascunde vitezometrul
})
```

| Camp | Tip | Ce face |
|---|---|---|
| `speed` | numar >= 0 | viteza in km/h |
| `gear` | `1`-`5` sau `'R'` | treapta; daca lipseste, e dedusa din viteza |
| `rpm`, `hp`, `fuel`, `nitro` | 0.0-1.0 | arcurile vitezometrului (hp = sanatate motor) |
| `water`, `food` | 0.0-1.0 | orb-urile de sete / foame |
| `odo` | numar | odometrul (7 cifre; `client.lua` trimite km) |
| `engine`, `lights`, `locked`, `belt` | bool | butoanele B / H / L / J din vitezometru |
| `mic` | bool | orb-ul de microfon se aprinde cand vorbesti |
| `inVehicle` | bool | afiseaza / ascunde vitezometrul |
| `armor`, `spray` | numar | cele doua cifre din stanga jos |
| `playerId` | numar | `ID (…)` sus-dreapta |
| `players`, `maxPlayers` | numar | `1337 / 2000` sus-dreapta |
| `cash`, `bank` | numar | banii (se formateaza singuri: `1,300,000 $`) |
| `street`, `zone` | text (max 40) | strada si zona |
| `roundLeft`, `roundTotal` | secunde | timpul ramas si durata rundei (bara de scor) |
| `recSecs` | secunde | durata ActionCam |
| `fam`, `bal` | `{kills=, alive=}` | scorul celor doua echipe |

### 2. `hud:notify` - notificare

```lua
SendNUIMessage({ type = 'hud:notify', title = 'Succes', text = 'Vehicul parcat.', duration = 5000 })
```

`duration` e in milisecunde (implicit 5000). Bara de progres se goleste pe durata aceasta.

### 3. `hud:visible` - arata / ascunde tot HUD-ul

```lua
SendNUIMessage({ type = 'hud:visible', show = false })
```

### 4. `hud:config` - aspect

```lua
SendNUIMessage({ type = 'hud:config', accent = '#FF3366' })  -- culoarea principala (hex 6 cifre)
```

`backdrop` poate fi `'scene'` (poza, doar demo), `'plain'` (gri) sau `'clear'` (transparent, implicit in joc).

---

## Ce face `client.lua`

Citeste din joc la fiecare 100 ms in vehicul si 500 ms pe jos:

| Data | Sursa |
|---|---|
| viteza, rpm, treapta, hp motor | natives (`GetEntitySpeed`, `GetVehicleCurrentRpm`, `GetVehicleCurrentGear`, `GetVehicleEngineHealth`) |
| motor, faruri, lock | `GetIsVehicleEngineRunning`, `GetVehicleLightsState`, `GetVehicleDoorLockStatus` |
| armura, microfon | `GetPedArmour`, `NetworkIsPlayerTalking` |
| strada, zona | `GetStreetNameAtCoord`, `GetNameOfZone` |
| odometru | calculat din viteza, salvat local per numar de inmatriculare (KVP) |
| centura | tasta **J** (nu exista native pentru ea) |
| combustibil, nitro | `Entity(veh).state.fuel` / `.nitro` (0-100), altfel `GetVehicleFuelLevel` - **adapteaza la scriptul tau** |
| foame, sete, bani, ID | primite prin evenimentele de mai jos |

Ascunde si elementele GTA implicite (nume vehicul, zona, clasa, strada).

### Evenimente pentru alte scripturi (vRP etc.)

```lua
-- din client:
TriggerEvent('hud:setNeeds', food, water)   -- 0-100
TriggerEvent('hud:setMoney', cash, bank)
TriggerEvent('hud:setId', user_id)          -- ID-ul afisat; implicit server id
TriggerEvent('hud:notify', 'Titlu', 'Text', 5000)
TriggerEvent('hud:setVisible', true)

-- din server:
TriggerClientEvent('hud:setNeeds', source, food, water)
TriggerClientEvent('hud:setMoney', source, cash, bank)
TriggerClientEvent('hud:notify', source, 'Titlu', 'Text', 5000)

-- din alta resursa (client):
exports['hud']:notify('Titlu', 'Text', 5000)
exports['hud']:setVisible(false)
```

---

## Cum il faci sa mearga pe vRP

HUD-ul nu depinde de vRP; are nevoie doar sa-i dai valorile prin evenimentele de mai sus.
Numele functiilor vRP difera intre versiuni (vRP 1.x vs vRP 2), deci **le adaptezi tu**.
Schema este:

```lua
-- SERVER (intr-un script vRP, cand ai user_id-ul si valorile)
local source = vRP.getUserSource(user_id)            -- numele depinde de versiune
TriggerClientEvent('hud:setId', source, user_id)
TriggerClientEvent('hud:setNeeds', source, hunger_0_100, thirst_0_100)
TriggerClientEvent('hud:setMoney', source, wallet, bank)
```

- Cheama `hud:setNeeds` cand se schimba foamea/setea (hook-ul de survival din vRP) si `hud:setMoney` cand se schimba banii.
- Daca in vRP foamea e "cat de flamand esti" (0 = satul), inverseaza: `100 - valoare`.

---

## Testare rapida in browser (fara FiveM)

Serveste folderul `ui/` (ex. `python -m http.server --directory ui`), deschide pagina,
apoi in consola browserului:

```js
window.postMessage({ type: 'hud:update', speed: 132, gear: 3, fuel: 0.4, cash: 5500 }, '*');
window.postMessage({ type: 'hud:notify', title: 'Info', text: 'Salut', duration: 3000 }, '*');
```

Daca deschizi `index.html` direct (`file://`) unele previzualizari nu incarca `script.js`.

---

## Ce afiseaza HUD-ul

| Zona | Ce contine |
|---|---|
| Sus, centru (`.score`) | Scor runda intre doua echipe: kill-uri, jucatori in viata, timp ramas, bara de progres |
| Dreapta sus (`.topright`) | ID jucator, jucatori online, badge X2, logo + nume server |
| Stanga jos (`.vitals`) | Doua cifre (armor, spray) si zona curenta (ex. "Green zone") |
| Jos (`.stats`) | Temperatura, bani, ceas + data, strada/zona |
| Orb-uri (`.orbs`) | Sete, foame, microfon |
| Dreapta (`.keys`) | Lista de taste afisate (doar text, nu leaga taste reale) |
| `.promo`, `.quest`, `.rec` | Banner oferta, quest curent, ActionCam (texte statice, in afara de `recSecs`) |
| `.notif` | Notificare |
| Vitezometru (`.speedo`) | Viteza, treapta, RPM, HP motor, nitro, combustibil, odometru, indicatori faruri/lock/centura/motor |

Raman **statice** (se schimba doar din HTML): temperatura, textele din `.promo`, `.quest`,
`.keys`, `.rec` (data), "Green zone", `X2`, ammo.

---

## Cum functioneaza `script.js`

- **`settings`** - `accent`, `inVehicle`, `live` (demo animat), `backdrop`.
- **`car`** - starea afisata (viteza, rpm, fuel, bani, scor etc.). Mesajele din Lua scriu aici.
- **`update()`** - simuleaza date doar in demo. In joc nu face nimic (`bridge = true`).
- **`draw()`** - scrie `car` pe ecran: text prin `data-bind`, bare prin variabile CSS
  (`--nitro`, `--fuel`, `--rpm`, `--hp`, `--v`, `--p`, valori 0-100), stari prin clase (`on`, `off`, `talk`…).
- **Listener `message`** - la finalul fisierului; filtreaza dupa `type` si valideaza campurile.
- Treptele din demo se deduc din `gearLimits = [40, 80, 125, 190, 260]`; in joc vin din `gear`.

### Campurile `data-bind` din HTML

`famKills`, `famAlive`, `balKills`, `balAlive`, `roundLabel`, `recTime`, `clockLabel`, `dateLabel`,
`speed`, `nitroN`, `fuelL`, `odoZeros`, `odoDigits`, `playerId`, `playersLabel`, `cash`, `bank`,
`street`, `zone`, `notifTitle`, `notifText`. (Cele doua cifre armor/spray sunt legate din JS.)

Ora si data sunt luate din ceasul calculatorului (jucatorului), nu din ora jocului.

---

## Cum modifici lucruri

| Vrei sa… | Modifici |
|---|---|
| Schimbi culoarea principala | `settings.accent` in `script.js` sau mesajul `hud:config` |
| Schimbi numele serverului | `.brand-name` si `.brand-sub` in `index.html` |
| Schimbi logo-ul | inlocuiesti `ui/assets/logo.png` (acelasi nume) |
| Schimbi echipele / culorile lor | `.team-name` si `style="color:#..."` din `.team` in `index.html` |
| Schimbi tastele afisate | blocul `<section class="keys">` din `index.html` |
| Schimbi quest-ul / oferta | `.quest-title`, `.quest-sub`, `.promo-text` in `index.html` |
| Schimbi sursa combustibilului | variabila `fuel` din `client.lua` |
| Schimbi tasta centurii | `RegisterKeyMapping('hud_belt', ..., 'J')` din `client.lua` (jucatorul o poate schimba si din setarile FiveM) |

Dimensiunile se scaleaza automat la rezolutie (unitatea `--u` din CSS), deci arata la fel pe 1080p, 1440p sau 4K.
Animatiile se opresc daca utilizatorul are "reduce motion" activat.

---

## Probleme frecvente

- **Nu apare nimic in joc:** verifica `ensure hud` si consola F8 pentru erori NUI; fundalul trebuie sa fie `clear` (e automat in joc).
- **Vitezometrul nu apare:** trebuie sa fii intr-un vehicul (`inVehicle = true`).
- **Combustibil mereu plin / gol:** scriptul tau de combustibil foloseste alta sursa - editeaza `fuel` in `client.lua`.
- **Foame/sete stau la 100%:** nimeni nu trimite `hud:setNeeds` - vezi sectiunea vRP.
- **Butoanele din vitezometru nu reactioneaza la click in joc:** corect, in joc sunt doar indicatoare.
