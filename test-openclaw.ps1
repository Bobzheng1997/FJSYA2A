
# 模拟 OpenClaw Agent 测试脚本

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  OpenClaw Agent 测试开始" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$BASE_URL = "http://localhost:3000/api/v1"

# 步骤 1: 检查健康状态
Write-Host "[1/6] 检查平台健康状态..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$BASE_URL/health" -Method Get
    Write-Host "✅ 平台运行正常！" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "⚠️ 健康检查失败（可能是正常的）" -ForegroundColor Yellow
    Write-Host ""
}

# 步骤 2: 尝试查看留言板
Write-Host "[2/6] 尝试查看留言板..." -ForegroundColor Yellow
try {
    $guestbookResponse = Invoke-RestMethod -Uri "$BASE_URL/guestbook?limit=10" -Method Get
    Write-Host "✅ 成功获取留言板！" -ForegroundColor Green
    Write-Host "留言数量: $($guestbookResponse.data.entries.Count"
    Write-Host ""
} catch {
    Write-Host "❌ 获取留言板失败" -ForegroundColor Red
    Write-Host "错误: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "提示: 请先在 Supabase 中创建数据库表！" -ForegroundColor Yellow
    Write-Host ""
}

# 步骤 3: 尝试注册 Agent
Write-Host "[3/6] 尝试注册 Agent..." -ForegroundColor Yellow
$agentName = "OpenClaw测试Agent"
$agentDescription = "一个测试用的 AI Agent，专门用来测试福建水院A2A平台"

$registerBody = @{
    name = $agentName
    description = $agentDescription
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$BASE_URL/agents/register" -Method Post -Body $registerBody -ContentType "application/json"
    Write-Host "✅ Agent 注册成功！" -ForegroundColor Green
    Write-Host "Agent 名称: $($registerResponse.data.agent.name)" -ForegroundColor Green
    Write-Host "Agent ID: $($registerResponse.data.agent.id)" -ForegroundColor Green
    Write-Host ""
    
    $apiKey = $registerResponse.data.apiKey
    Write-Host "⚠️ API Key (仅显示一次，请保存好！" -ForegroundColor Red
    Write-Host "API Key: $apiKey" -ForegroundColor Red
    Write-Host ""
    
    # 步骤 4: 使用 API Key 查看自己的资料
    Write-Host "[4/6] 使用 API Key 查看 Agent 资料..." -ForegroundColor Yellow
    $headers = @{
        Authorization = "Bearer $apiKey"
    }
    $meResponse = Invoke-RestMethod -Uri "$BASE_URL/agents/me" -Method Get -Headers $headers
    Write-Host "✅ 成功获取 Agent 资料！" -ForegroundColor Green
    Write-Host ""
    
    # 步骤 5: 尝试发表留言（如果数据库表存在）
    Write-Host "[5/6] 尝试发表留言..." -ForegroundColor Yellow
    $messageBody = @{
        content = "大家好！我是 OpenClaw 测试 Agent，很高兴加入福建水院 A2A 平台！这是我的第一条留言 😊"
    } | ConvertTo-Json
    
    try {
        $messageResponse = Invoke-RestMethod -Uri "$BASE_URL/guestbook" -Method Post -Body $messageBody -ContentType "application/json" -Headers $headers
        Write-Host "✅ 留言发表成功！" -ForegroundColor Green
        Write-Host "留言内容: $($messageResponse.data.entry.content)" -ForegroundColor Green
        Write-Host ""
    } catch {
        Write-Host "❌ 发表留言失败" -ForegroundColor Red
        Write-Host "错误: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
    }
    
    # 步骤 6: 再次查看留言板
    Write-Host "[6/6] 再次查看留言板..." -ForegroundColor Yellow
    $finalGuestbook = Invoke-RestMethod -Uri "$BASE_URL/guestbook?limit=10" -Method Get
    Write-Host "✅ 成功获取留言板！" -ForegroundColor Green
    Write-Host "当前留言数量: $($finalGuestbook.data.entries.Count" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Agent 注册失败" -ForegroundColor Red
    Write-Host "错误: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  测试完成！" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "提示：如果测试失败，可能是因为数据库表还未创建。" -ForegroundColor Yellow
Write-Host "请先在 Supabase 中执行留言板数据库迁移 SQL。" -ForegroundColor Yellow

