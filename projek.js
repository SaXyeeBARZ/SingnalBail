-- ==========================================================
-- Zxc X Sasaki - Multi-Map Auto Detector & Hub (Config List & Auto Load Toggle Fix)
-- ==========================================================

local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer
local HttpService = game:GetService("HttpService")
local currentPlaceId = game.PlaceId

-- Folder Penyimpanan Config
local ConfigFolderName = "ZxcSasakiConfigs"
if not isfolder(ConfigFolderName) then
    makefolder(ConfigFolderName)
end

-- Daftar PlaceID dan Pengaturannya per Map
MapConfigurations = {
    -- Map: Tartarus
    [80693195250724] = {
        MapName = "Iron Soul - Tartarus",
        Stages = {
            Vector3.new(46.70, 28.02, 118.47),
            Vector3.new(-4054.54, 450.92, 1569.93),
            Vector3.new(-4334.47, 452.98, 3175.34),
            Vector3.new(-8772.03, 206.83, -1889.39),
            Vector3.new(-4441.09, 528.40, -1934.43)
        },
        AutoTeleport = true
    },
    
    -- Map: Tower (Khusus Tower, jarak stud bos diset berbeda sendiri menjadi 13)
    [88838868041067] = {
        MapName = "Iron Soul - Tower",
        Stages = {},
        AutoTeleport = false,
        CustomBossStud = 13
    },

    -- Map: Kastil
    [112316840155266] = {
        MapName = "Iron Soul - Kastil",
        Stages = {
            Vector3.new(-12.30, -7.26, 816.04),
            Vector3.new(55.46, 10.55, 284.96),
            Vector3.new(687.08, 64.36, -29.94),
            Vector3.new(-1014.11, 18.03, 256.28)
        },
        AutoTeleport = true
    },

    -- Map: Frozen Valley
    [136216144170036] = {
        MapName = "Iron Soul - Frozen Valley",
        Stages = {
            Vector3.new(-4410.69, 561.36, 1576.58),
            Vector3.new(-4209.80, 561.04, 1586.07),
            Vector3.new(-4104.02, 562.10, 1584.10),
            Vector3.new(-6395.46, 4.03, -1441.56),
            Vector3.new(-4051.98, 563.00, 2504.04),
            Vector3.new(-4119.12, 650.04, -1870.81)
        },
        AutoTeleport = true
    },
}

print("==========================================")
print("Zxc X Sasaki - PlaceID Terdeteksi: " .. tostring(currentPlaceId))
print("==========================================")

local currentMapConfig = MapConfigurations[currentPlaceId]

if currentMapConfig then
    print("[Auto Loader] Map dikenali: " .. currentMapConfig.MapName .. ". Memuat skrip...")
    
    local RunService = game:GetService("RunService")
    local VirtualInputManager = game:GetService("VirtualInputManager")

    local Config = {
        AutoFarm = false,
        Noclip = false,
        AutoAttack = false,
        AutoSkill = false,
        StudDistance = 12
    }

    -- Variabel untuk Sistem Config
    local currentConfigName = "default"
    local selectedConfigToManage = "default"
    local isAutoLoadEnabled = false
    local AutoLoadFileName = ConfigFolderName .. "/autoadload_" .. tostring(currentPlaceId) ..".json"

    -- Fungsi Mendapatkan List File Config yang Tersedia
    local function GetConfigList()
        local list = {}
        for _, file in ipairs(listfiles(ConfigFolderName)) do
            local name = file:match("([^/]+)$"):match("([^\]+)$")
            if name and name:sub(-5) == ".json" and not name:match("^autoadload_") then
                local configName = name:sub(1, -6)
                table.insert(list, configName)
            end
        end
        if #list == 0 then
            table.insert(list, "default")
        end
        return list
    end

    -- Fungsi Auto Load Config Saat Startup
    local function CheckAutoLoad()
        if isfile(AutoLoadFileName) then
            local success, data = pcall(function()
                return HttpService:JSONDecode(readfile(AutoLoadFileName))
            end)
            if success and data and data.Enabled and data.ConfigName then
                local targetFile = ConfigFolderName .. "/" .. data.ConfigName .. ".json"
                if isfile(targetFile) then
                    local sLoad, loadData = pcall(function()
                        return HttpService:JSONDecode(readfile(targetFile))
                    end)
                    if sLoad and loadData then
                        for k, v in pairs(loadData) do
                            Config[k] = v
                        end
                        currentConfigName = data.ConfigName
                        selectedConfigToManage = data.ConfigName
                        isAutoLoadEnabled = true
                        print("[Config System] Berhasil memuat Auto-Load Config: " .. data.ConfigName)
                    end
                end
            end
        end
    end
    CheckAutoLoad()

    local Stages = currentMapConfig.Stages
    local currentStageIndex = 1
    local isTeleporting = false
    local isMobEmpty = false

    local function StartEngine()
        RunService.Stepped:Connect(function()
            if Config.Noclip and LocalPlayer.Character then
                for _, p in pairs(LocalPlayer.Character:GetDescendants()) do
                    if p:IsA("BasePart") then p.CanCollide = false end
                end
            end
        end)
        
        task.spawn(function()
            while task.wait(0.05) do
                if Config.AutoFarm and Config.AutoAttack then
                    pcall(function()
                        VirtualInputManager:SendMouseButtonEvent(0, 0, 0, true, nil, 0)
                        VirtualInputManager:SendMouseButtonEvent(0, 0, 0, false, nil, 0)
                    end)
                end
            end
        end)

        -- Auto Skill dicancel sementara jika mob/bos kosong di Tower
        task.spawn(function()
            while task.wait(0.5) do
                if Config.AutoFarm and Config.AutoSkill then
                    if isMobEmpty then
                        continue
                    end
                    pcall(function()
                        for _, k in ipairs({'Q', 'G', 'R', 'E'}) do
                            VirtualInputManager:SendKeyEvent(true, k, false, nil)
                            task.wait(0.05)
                            VirtualInputManager:SendKeyEvent(false, k, false, nil)
                            task.wait(0.15)
                        end
                    end)
                end
            end
        end)

        RunService.Heartbeat:Connect(function()
            pcall(function()
                if Config.AutoFarm and LocalPlayer.Character and not isTeleporting then
                    local hrp = LocalPlayer.Character:FindFirstChild("HumanoidRootPart")
                    local hum = LocalPlayer.Character:FindFirstChild("Humanoid")
                    
                    if hrp and hum and hum.Health > 0 then
                        
                        -- ====================================================
                        -- ANTI-VOID FAILSAFE: Mencegah Jatuh Ke Bawah Tanah (Y < -50)
                        -- ====================================================
                        if hrp.Position.Y < -50 then
                            hrp.Anchored = false
                            hrp.Velocity = Vector3.new(0, 0, 0)
                            hrp.CFrame = CFrame.new(hrp.Position.X, 150, hrp.Position.Z)
                        end
                        -- ====================================================

                        local nearestMob = nil
                        local shortestDist = math.huge
                        local mobCount = 0
                        
                        -- Scan Workspace untuk mendeteksi mob ATAU boss yang aktif di sekitar
                        for _, obj in ipairs(workspace:GetDescendants()) do
                            if obj:IsA("Model") and obj ~= LocalPlayer.Character then
                                local humanoid = obj:FindFirstChildOfClass("Humanoid")
                                local root = obj:FindFirstChild("HumanoidRootPart") or obj:FindFirstChild("Torso")
                                
                                if humanoid and root and not Players:GetPlayerFromCharacter(obj) then
                                    if humanoid.Health > 0.1 then
                                        mobCount = mobCount + 1
                                        local dist = (hrp.Position - root.Position).Magnitude
                                        if dist < shortestDist then
                                            shortestDist = dist
                                            nearestMob = root
                                        end
                                    end
                                end
                            end
                        end
                        
                        if nearestMob and mobCount > 0 then
                            -- ADA MOB / BOS DI SEMUA MAP:
                            isMobEmpty = false
                            hrp.Anchored = false 
                            hum.PlatformStand = true
                            
                            -- Tentukan jarak stud: Jika di map Tower, gunakan 13 stud, selain itu pakai dari Config (Slider)
                            local activeStud = Config.StudDistance
                            if currentMapConfig.CustomBossStud then
                                activeStud = currentMapConfig.CustomBossStud
                            end
                            
                            -- Posisikan di bawah bos sejauh activeStud
                            hrp.CFrame = nearestMob.CFrame * CFrame.new(0, -activeStud, 0) * CFrame.Angles(math.rad(90), 0, 0)
                            
                        elseif mobCount == 0 and currentMapConfig.AutoTeleport then
                            hum.PlatformStand = false
                            hrp.Anchored = false
                            if currentStageIndex <= #Stages then
                                isTeleporting = true
                                local targetPos = Stages[currentStageIndex]
                                hrp.CFrame = CFrame.new(targetPos)
                                currentStageIndex = currentStageIndex + 1
                                task.spawn(function()
                                    task.wait(1.5)
                                    isTeleporting = false
                                end)
                            else
                                currentStageIndex = 1
                            end
                            
                        elseif mobCount == 0 and not currentMapConfig.AutoTeleport then
                            -- TIDAK ADA MOB / BOS DI TOWER (Kondisi Kosong):
                            isMobEmpty = true
                            hum.PlatformStand = true 
                            
                            local raycastParams = RaycastParams.new()
                            raycastParams.FilterType = RaycastParams.FilterType.Exclude
                            raycastParams.FilterDescendantsInstances = {LocalPlayer.Character}
                            
                            local raycastResult = workspace:Raycast(hrp.Position + Vector3.new(0, 100, 0), Vector3.new(0, -500, 0), raycastParams)
                            
                            if raycastResult then
                                hrp.CFrame = CFrame.new(raycastResult.Position + Vector3.new(0, 5, 0))
                            else
                                hrp.CFrame = CFrame.new(hrp.Position.X, 100, hrp.Position.Z)
                            end
                            
                            hrp.Velocity = Vector3.new(0, 0, 0)
                            hrp.RotVelocity = Vector3.new(0, 0, 0)
                            hrp.Anchored = true 
                        end
                    end
                else
                    -- JIKA AUTO FARM DIMATIKAN: Normalkan Karakter
                    if LocalPlayer.Character then
                        local hum = LocalPlayer.Character:FindFirstChild("Humanoid")
                        local hrp = LocalPlayer.Character:FindFirstChild("HumanoidRootPart")
                        if hum then hum.PlatformStand = false end
                        if hrp then hrp.Anchored = false end
                    end
                end
            end)
        end)
    end

    local windowTitle = "Zxc X Sasaki - " .. currentMapConfig.MapName

    local function LoadWindUI()
        StartEngine()
        local WindUI = loadstring(game:HttpGet("https://raw.githubusercontent.com/Footagesus/WindUI/refs/heads/main/dist/main.lua"))()
        local Window = WindUI:CreateWindow({ Title = windowTitle, Icon = "sword", Author = "Wind UI", Size = UDim2.fromOffset(580, 460), Theme = "Dark" })
        
        -- Tab Farming
        local Tab = Window:Tab({ Title = "Farming", Icon = "crosshair" })
        local farmToggle = Tab:Toggle({ Title = "Auto Farm", Default = Config.AutoFarm, Callback = function(v) Config.AutoFarm = v end })
        local noclipToggle = Tab:Toggle({ Title = "Noclip", Default = Config.Noclip, Callback = function(v) Config.Noclip = v end })
        local attackToggle = Tab:Toggle({ Title = "Auto Attack", Default = Config.AutoAttack, Callback = function(v) Config.AutoAttack = v end })
        local skillToggle = Tab:Toggle({ Title = "Auto Skill", Default = Config.AutoSkill, Callback = function(v) Config.AutoSkill = v end })
        local studSlider = Tab:Slider({ Title = "Jarak Stud", Step = 0.5, Value = { Min = 2, Max = 20, Default = Config.StudDistance }, Callback = function(v) Config.StudDistance = v end })

        -- Tab Config
        local ConfigTab = Window:Tab({ Title = "Configs", Icon = "settings" })
        
        ConfigTab:Input({
            Title = "Name Config",
            Placeholder = "Masukkan nama config...",
            Callback = function(v)
                selectedConfigToManage = v
            end
        })

        ConfigTab:Button({
            Title = "Create Config",
            Callback = function()
                if selectedConfigToManage == "" then return end
                local filePath = ConfigFolderName .. "/" .. selectedConfigToManage .. ".json"
                if not isfile(filePath) then
                    writefile(filePath, HttpService:JSONEncode(Config))
                    WindUI:Notify({ Title = "Config Success", Content = "Config '" .. selectedConfigToManage .. "' berhasil dibuat!", Duration = 3 })
                else
                    WindUI:Notify({ Title = "Config Warning", Content = "Config sudah ada! Gunakan Overwrite.", Duration = 3 })
                end
            end
        })

        local configDropdown = ConfigTab:Dropdown({
            Title = "Config List",
            Values = GetConfigList(),
            Value = selectedConfigToManage,
            Callback = function(v)
                selectedConfigToManage = v
            end
        })

        ConfigTab:Button({
            Title = "Overwrite Config",
            Callback = function()
                if selectedConfigToManage == "" then return end
                local filePath = ConfigFolderName .. "/" .. selectedConfigToManage .. ".json"
                writefile(filePath, HttpService:JSONEncode(Config))
                WindUI:Notify({ Title = "Config Success", Content = "Config '" .. selectedConfigToManage .. "' berhasil ditimpa (overwrite)!", Duration = 3 })
            end
        })

        ConfigTab:Button({
            Title = "Load Config",
            Callback = function()
                if selectedConfigToManage == "" then return end
                local filePath = ConfigFolderName .. "/" .. selectedConfigToManage .. ".json"
                if isfile(filePath) then
                    local success, data = pcall(function()
                        return HttpService:JSONDecode(readfile(filePath))
                    end)
                    if success and data then
                        for k, v in pairs(data) do
                            Config[k] = v
                        end
                        -- Update UI Elements secara otomatis
                        if farmToggle and farmToggle.Set then farmToggle:Set(Config.AutoFarm) end
                        if noclipToggle and noclipToggle.Set then noclipToggle:Set(Config.Noclip) end
                        if attackToggle and attackToggle.Set then attackToggle:Set(Config.AutoAttack) end
                        if skillToggle and skillToggle.Set then skillToggle:Set(Config.AutoSkill) end
                        if studSlider and studSlider.Set then studSlider:Set(Config.StudDistance) end

                        WindUI:Notify({ Title = "Config Success", Content = "Config '" .. selectedConfigToManage .. "' berhasil dimuat!", Duration = 3 })
                    end
                else
                    WindUI:Notify({ Title = "Config Error", Content = "Config tidak ditemukan!", Duration = 3 })
                end
            end
        })

        ConfigTab:Toggle({
            Title = "Set As Auto Load",
            Default = isAutoLoadEnabled,
            Callback = function(v)
                isAutoLoadEnabled = v
                if v then
                    if selectedConfigToManage == "" then return end
                    local filePath = ConfigFolderName .. "/" .. selectedConfigToManage .. ".json"
                    if isfile(filePath) then
                        writefile(AutoLoadFileName, HttpService:JSONEncode({ Enabled = true, ConfigName = selectedConfigToManage }))
                        WindUI:Notify({ Title = "Auto Load", Content = "Auto load diaktifkan untuk: " .. selectedConfigToManage, Duration = 3 })
                    else
                        WindUI:Notify({ Title = "Auto Load Error", Content = "Config belum ada/dibuat!", Duration = 3 })
                    end
                else
                    if isfile(AutoLoadFileName) then
                        writefile(AutoLoadFileName, HttpService:JSONEncode({ Enabled = false, ConfigName = selectedConfigToManage }))
                    end
                    WindUI:Notify({ Title = "Auto Load", Content = "Auto load dimatikan.", Duration = 3 })
                end
            end
        })

        -- Tab TQtq
        local TQtqTab = Window:Tab({ Title = "TQtq", Icon = "heart" })
        TQtqTab:Paragraph({
            Title = "Thanks For Dev",
            Content = "Thanks For Dev : SasakiIsBarz and all user"
        })
    end

    local function LoadRayfieldUI()
        StartEngine()
        local Rayfield = loadstring(game:HttpGet('https://sirius.menu/rayfield'))()
        local Window = Rayfield:CreateWindow({ Name = windowTitle, LoadingTitle = "Rayfield UI", ConfigurationSaving = { Enabled = false } })
        
        -- Tab Farming
        local Tab = Window:CreateTab("Farming", 4483362458)
        local farmToggle = Tab:CreateToggle({ Name = "Auto Farm", CurrentValue = Config.AutoFarm, Callback = function(v) Config.AutoFarm = v end })
        local noclipToggle = Tab:CreateToggle({ Name = "Noclip", CurrentValue = Config.Noclip, Callback = function(v) Config.Noclip = v end })
        local attackToggle = Tab:CreateToggle({ Name = "Auto Attack", CurrentValue = Config.AutoAttack, Callback = function(v) Config.AutoAttack = v end })
        local skillToggle = Tab:CreateToggle({ Name = "Auto Skill", CurrentValue = Config.AutoSkill, Callback = function(v) Config.AutoSkill = v end })
        local studSlider = Tab:CreateSlider({ Name = "Jarak Stud", Range = {2, 20}, Increment = 0.5, CurrentValue = Config.StudDistance, Callback = function(v) Config.StudDistance = v end })

        -- Tab Config
        local ConfigTab = Window:CreateTab("Configs", 4483362458)

        ConfigTab:CreateInput({
            Name = "Name Config",
            PlaceholderText = "Masukkan nama config...",
            RemoveTextAfterFocusLost = false,
            Callback = function(v)
                selectedConfigToManage = v
            end
        })

        ConfigTab:CreateButton({
            Name = "Create Config",
            Callback = function()
                if selectedConfigToManage == "" then return end
                local filePath = ConfigFolderName .. "/" .. selectedConfigToManage .. ".json"
                if not isfile(filePath) then
                    writefile(filePath, HttpService:JSONEncode(Config))
                    Rayfield:Notify({ Title = "Config Success", Content = "Config '" .. selectedConfigToManage .. "' berhasil dibuat!", Duration = 3 })
                else
                    Rayfield:Notify({ Title = "Config Warning", Content = "Config sudah ada! Gunakan Overwrite.", Duration = 3 })
                end
            end
        })

        ConfigTab:CreateDropdown({
            Name = "Config List",
            Options = GetConfigList(),
            CurrentOption = selectedConfigToManage,
            Flag = "ConfigListDropdown",
            Callback = function(v)
                if type(v) == "table" then
                    selectedConfigToManage = v[1]
                else
                    selectedConfigToManage = v
                end
            end
        })

        ConfigTab:CreateButton({
            Name = "Overwrite Config",
            Callback = function()
                if selectedConfigToManage == "" then return end
                local filePath = ConfigFolderName .. "/" .. selectedConfigToManage .. ".json"
                writefile(filePath, HttpService:JSONEncode(Config))
                Rayfield:Notify({ Title = "Config Success", Content = "Config '" .. selectedConfigToManage .. "' berhasil ditimpa!", Duration = 3 })
            end
        })

        ConfigTab:CreateButton({
            Name = "Load Config",
            Callback = function()
                if selectedConfigToManage == "" then return end
                local filePath = ConfigFolderName .. "/" .. selectedConfigToManage .. ".json"
                if isfile(filePath) then
                    local success, data = pcall(function()
                        return HttpService:JSONDecode(readfile(filePath))
                    end)
                    if success and data then
                        for k, v in pairs(data) do
                            Config[k] = v
                        end
                        Rayfield:Notify({ Title = "Config Success", Content = "Config '" .. selectedConfigToManage .. "' dimuat!", Duration = 3 })
                    end
                else
                    Rayfield:Notify({ Title = "Config Error", Content = "Config tidak ditemukan!", Duration = 3 })
                end
            end
        })

        ConfigTab:CreateToggle({
            Name = "Set As Auto Load",
            CurrentValue = isAutoLoadEnabled,
            Callback = function(v)
                isAutoLoadEnabled = v
                if v then
                    if selectedConfigToManage == "" then return end
                    local filePath = ConfigFolderName .. "/" .. selectedConfigToManage .. ".json"
                    if isfile(filePath) then
                        writefile(AutoLoadFileName, HttpService:JSONEncode({ Enabled = true, ConfigName = selectedConfigToManage }))
                        Rayfield:Notify({ Title = "Auto Load", Content = "Auto load diaktifkan untuk: " .. selectedConfigToManage, Duration = 3 })
                    else
                        Rayfield:Notify({ Title = "Auto Load Error", Content = "Config belum ada!", Duration = 3 })
                    end
                else
                    if isfile(AutoLoadFileName) then
                        writefile(AutoLoadFileName, HttpService:JSONEncode({ Enabled = false, ConfigName = selectedConfigToManage }))
                    end
                    Rayfield:Notify({ Title = "Auto Load", Content = "Auto load dimatikan.", Duration = 3 })
                end
            end
        })

        -- Tab TQtq
        local TQtqTab = Window:CreateTab("TQtq", 4483362458)
        TQtqTab:CreateParagraph({ Title = "Thanks For Dev", Content = "Thanks For Dev : SasakiIsBarz and all user" })
    end

    local function LoadOrionUI()
        StartEngine()
        local OrionLib = loadstring(game:HttpGet('https://raw.githubusercontent.com/jensonhirst/Orion/main/source'))()
        local Window = OrionLib:MakeWindow({ Name = windowTitle, HidePremium = false, SaveConfig = false })
        
        -- Tab Farming
        local Tab = Window:MakeTab({ Name = "Farming", Icon = "rbxassetid://4483345998", PremiumOnly = false })
        Tab:AddToggle({ Name = "Auto Farm", Default = Config.AutoFarm, Callback = function(v) Config.AutoFarm = v end })
        Tab:AddToggle({ Name = "Noclip", Default = Config.Noclip, Callback = function(v) Config.Noclip = v end })
        Tab:AddToggle({ Name = "Auto Attack", Default = Config.AutoAttack, Callback = function(v) Config.AutoAttack = v end })
        Tab:AddToggle({ Name = "Auto Skill", Default = Config.AutoSkill, Callback = function(v) Config.AutoSkill = v end })
        Tab:AddSlider({ Name = "Jarak Stud", Min = 2, Max = 20, Default = Config.StudDistance, Increment = 0.5, ValueName = "stud", Callback = function(v) Config.StudDistance = v end })

        -- Tab Config
        local ConfigTab = Window:MakeTab({ Name = "Configs", Icon = "rbxassetid://4483345998", PremiumOnly = false })

        ConfigTab:AddTextbox({
            Name = "Name Config",
            Default = "default",
            TextDisappear = false,
            Callback = function(v)
                selectedConfigToManage = v
            end
        })

        ConfigTab:AddButton({
            Name = "Create Config",
            Callback = function()
                if selectedConfigToManage == "" then return end
                local filePath = ConfigFolderName .. "/" .. selectedConfigToManage .. ".json"
                if not isfile(filePath) then
                    writefile(filePath, HttpService:JSONEncode(Config))
                    OrionLib:MakeNotification({ Name = "Config Success", Content = "Config berhasil dibuat!", Time = 3 })
                else
                    OrionLib:MakeNotification({ Name = "Config Warning", Content = "Config sudah ada! Gunakan Overwrite.", Time = 3 })
                end
            end
        })

        ConfigTab:AddDropdown({
            Name = "Config List",
            Default = selectedConfigToManage,
            Options = GetConfigList(),
            Callback = function(v)
                selectedConfigToManage = v
            end
        })

        ConfigTab:AddButton({
            Name = "Overwrite Config",
            Callback = function()
                if selectedConfigToManage == "" then return end
                local filePath = ConfigFolderName .. "/" .. selectedConfigToManage .. ".json"
                writefile(filePath, HttpService:JSONEncode(Config))
                OrionLib:MakeNotification({ Name = "Config Success", Content = "Config berhasil ditimpa!", Time = 3 })
            end
        })

        ConfigTab:AddButton({
            Name = "Load Config",
            Callback = function()
                if selectedConfigToManage == "" then return end
                local filePath = ConfigFolderName .. "/" .. selectedConfigToManage .. ".json"
                if isfile(filePath) then
                    local success, data = pcall(function()
                        return HttpService:JSONDecode(readfile(filePath))
                    end)
                    if success and data then
                        for k, v in pairs(data) do
                            Config[k] = v
                        end
                        OrionLib:MakeNotification({ Name = "Config Success", Content = "Config dimuat!", Time = 3 })
                    end
                else
                    OrionLib:MakeNotification({ Name = "Config Error", Content = "Config tidak ditemukan!", Time = 3 })
                end
            end
        })

        ConfigTab:AddToggle({
            Name = "Set As Auto Load",
            Default = isAutoLoadEnabled,
            Callback = function(v)
                isAutoLoadEnabled = v
                if v then
                    if selectedConfigToManage == "" then return end
                    local filePath = ConfigFolderName .. "/" .. selectedConfigToManage .. ".json"
                    if isfile(filePath) then
                        writefile(AutoLoadFileName, HttpService:JSONEncode({ Enabled = true, ConfigName = selectedConfigToManage }))
                        OrionLib:MakeNotification({ Name = "Auto Load Set", Content = "Auto load diaktifkan!", Time = 3 })
                    else
                        OrionLib:MakeNotification({ Name = "Auto Load Error", Content = "Config belum ada!", Time = 3 })
                    end
                else
                    if isfile(AutoLoadFileName) then
                        writefile(AutoLoadFileName, HttpService:JSONEncode({ Enabled = false, ConfigName = selectedConfigToManage }))
                    end
                    OrionLib:MakeNotification({ Name = "Auto Load", Content = "Auto load dimatikan.", Time = 3 })
                end
            end
        })

        -- Tab TQtq
        local TQtqTab = Window:MakeTab({ Name = "TQtq", Icon = "rbxassetid://4483345998", PremiumOnly = false })
        TQtqTab:AddParagraph("Thanks For Dev", "Thanks For Dev : SasakiIsBarz and all user")

        OrionLib:Init()
    end

    local OrionLauncher = loadstring(game:HttpGet('https://raw.githubusercontent.com/jensonhirst/Orion/main/source'))()
    local LauncherWindow = OrionLauncher:MakeWindow({ Name = "Zxc X Sasaki - UI Selector", HidePremium = false, SaveConfig = false })
    local SelectorTab = LauncherWindow:MakeTab({ Name = "Pilih UI", Icon = "rbxassetid://4483345998", PremiumOnly = false })

    SelectorTab:AddParagraph("Pilih UI Library", "Pilih UI Library untuk " .. currentMapConfig.MapName .. ":")
    SelectorTab:AddButton({ Name = "1. Gunakan Wind UI", Callback = function() OrionLauncher:Destroy() task.wait(0.3) LoadWindUI() end })
    SelectorTab:AddButton({ Name = "2. Gunakan Rayfield UI", Callback = function() OrionLauncher:Destroy() task.wait(0.3) LoadRayfieldUI() end })
    SelectorTab:AddButton({ Name = "3. Gunakan Orion UI", Callback = function() OrionLauncher:Destroy() task.wait(0.3) LoadOrionUI() end })

    OrionLauncher:Init()
else
    warn("[Auto Loader] PlaceID " .. tostring(currentPlaceId) .. " tidak terdaftar di skrip!")
end
