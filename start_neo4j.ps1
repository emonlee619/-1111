# Neo4j 启动脚本
# 解决中文路径问题

$neo4jPath = "D:\AAA大学\竞赛\安全年会\程序\neo4j-community-5.26.4"

# 设置环境变量
$env:NEO4J_HOME = $neo4jPath
$env:JAVA_HOME = [System.Environment]::GetEnvironmentVariable("JAVA_HOME", "Machine")

Write-Host "NEO4J_HOME: $env:NEO4J_HOME"
Write-Host "JAVA_HOME: $env:JAVA_HOME"

# 进入 bin 目录
Set-Location "$neo4jPath\bin"

# 启动 Neo4j console
Write-Host "正在启动 Neo4j..."
& ".\neo4j.bat" console