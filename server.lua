CreateThread(function()
  while true do
    TriggerClientEvent('hud:players', -1, GetNumPlayerIndices(), GetConvarInt('sv_maxclients', 48))
    Wait(10000)
  end
end)

RegisterNetEvent('hud:requestPlayers', function()
  TriggerClientEvent('hud:players', source, GetNumPlayerIndices(), GetConvarInt('sv_maxclients', 48))
end)
