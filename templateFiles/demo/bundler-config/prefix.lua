-- This script is prepended to the output script
--
-- Expo's Bundler Prefix Script
-- Forked & Stripped by Mokiy
-- Copyright (c) 2022 ExponentialWorkload.
-- Copyright (c) 2022 MokiyCodes.
-- MIT License

--[[
  DO NOT TOUCH!!! This handles module resolution (require()s) & is a vital part of the functionality
--]]
local null = nil
local modules = {} -- we will assign modules to here later
local oldRequire = require
local require = function(...) -- handle loading modules
  local requested, returned = { ... }, {}
  for _, filepath in pairs(requested) do
    if not modules[filepath] then
      local fallbackMod
      pcall(function()
        fallbackMod = oldRequire(filepath)
      end)
      if typeof(fallbackMod) ~= 'nil' then
        return fallbackMod
      end
      error('[blb] no such module \'' .. filepath .. '\'')
    end
    local module = modules[filepath]
    if module.isCached then
      table.insert(returned, module.cache)
    else
      local moduleValue = module.load()
      module.cache = moduleValue
      module.isCached = true
      table.insert(returned, module.cache)
    end
  end
  return table.unpack(returned)
end
