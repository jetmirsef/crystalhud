local needs = { food = 100.0, water = 100.0 }
local money = { cash = 0, bank = 0 }
local overrideId = nil
local players, maxPlayers = 0, 0
local belted = false

local function clamp01(n)
  if n < 0.0 then return 0.0 end
  if n > 1.0 then return 1.0 end
  return n
end

local function send(data)
  SendNUIMessage(data)
end

RegisterNetEvent('hud:setNeeds', function(food, water)
  needs.food = tonumber(food) or needs.food
  needs.water = tonumber(water) or needs.water
end)

RegisterNetEvent('hud:setMoney', function(cash, bank)
  money.cash = tonumber(cash) or money.cash
  money.bank = tonumber(bank) or money.bank
end)

RegisterNetEvent('hud:setId', function(id)
  overrideId = tonumber(id)
end)

RegisterNetEvent('hud:players', function(count, max)
  players, maxPlayers = count, max
end)

RegisterNetEvent('hud:notify', function(title, text, duration)
  send({ type = 'hud:notify', title = title, text = text, duration = duration })
end)

RegisterNetEvent('hud:setVisible', function(show)
  send({ type = 'hud:visible', show = show and true or false })
end)

exports('notify', function(title, text, duration)
  send({ type = 'hud:notify', title = title, text = text, duration = duration })
end)

exports('setVisible', function(show)
  send({ type = 'hud:visible', show = show and true or false })
end)

RegisterCommand('hud_belt', function()
  local ped = PlayerPedId()
  if GetVehiclePedIsIn(ped, false) == 0 then return end
  belted = not belted
  SetPedConfigFlag(ped, 32, not belted)
end, false)
RegisterKeyMapping('hud_belt', 'Centura de siguranta', 'keyboard', 'J')

CreateThread(function()
  Wait(500)
  send({ type = 'hud:visible', show = true })
  TriggerServerEvent('hud:requestPlayers')

  local odoKm, odoPlate, lastTick, lastSave = 0.0, nil, GetGameTimer(), 0

  while true do
    local ped = PlayerPedId()
    local veh = GetVehiclePedIsIn(ped, false)
    local inVeh = veh ~= 0
    local now = GetGameTimer()
    local coords = GetEntityCoords(ped)

    local data = {
      type = 'hud:update',
      inVehicle = inVeh,
      armor = GetPedArmour(ped),
      water = needs.water / 100.0,
      food = needs.food / 100.0,
      mic = NetworkIsPlayerTalking(PlayerId()),
      cash = money.cash,
      bank = money.bank,
      playerId = overrideId or GetPlayerServerId(PlayerId()),
      players = players,
      maxPlayers = maxPlayers,
      street = GetStreetNameFromHashKey((GetStreetNameAtCoord(coords.x, coords.y, coords.z))),
      zone = GetLabelText(GetNameOfZone(coords.x, coords.y, coords.z)),
    }

    if inVeh then
      local speedKmh = GetEntitySpeed(veh) * 3.6

      local gear = GetVehicleCurrentGear(veh)
      if GetEntitySpeedVector(veh, true).y < -0.5 then
        gear = 'R'
      elseif gear < 1 then
        gear = 1
      end

      local fuel = Entity(veh).state.fuel or GetVehicleFuelLevel(veh)
      local nitro = Entity(veh).state.nitro or 0

      local _, lightsOn, highBeams = GetVehicleLightsState(veh)

      local plate = (GetVehicleNumberPlateText(veh) or ''):gsub('%s+$', '')
      if plate ~= odoPlate then
        odoPlate = plate
        odoKm = GetResourceKvpFloat('hud:odo:' .. plate)
      end
      odoKm = odoKm + (speedKmh / 3600.0) * ((now - lastTick) / 1000.0)
      if now - lastSave > 5000 then
        SetResourceKvpFloat('hud:odo:' .. plate, odoKm)
        lastSave = now
      end

      data.speed = speedKmh
      data.rpm = clamp01(GetVehicleCurrentRpm(veh))
      data.gear = gear
      data.hp = clamp01(GetVehicleEngineHealth(veh) / 1000.0)
      data.fuel = clamp01(fuel / 100.0)
      data.nitro = clamp01(nitro / 100.0)
      data.odo = odoKm
      data.engine = GetIsVehicleEngineRunning(veh)
      data.lights = lightsOn == 1 or highBeams == 1
      data.locked = GetVehicleDoorLockStatus(veh) >= 2
      data.belt = belted
    else
      belted = false
      data.belt = false
      data.speed = 0
    end

    lastTick = now
    send(data)
    Wait(inVeh and 100 or 500)
  end
end)

CreateThread(function()
  while true do
    HideHudComponentThisFrame(6)
    HideHudComponentThisFrame(7)
    HideHudComponentThisFrame(8)
    HideHudComponentThisFrame(9)
    Wait(0)
  end
end)
