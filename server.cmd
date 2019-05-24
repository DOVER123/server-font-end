@echo off
set PATH=%cd%\nodejs;%cd%\install_oracle_node\instantclient_11_2
node %~dp0%nodecode\server.js
pause