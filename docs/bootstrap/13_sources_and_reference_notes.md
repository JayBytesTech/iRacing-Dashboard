# 13 - Sources and Reference Notes

These references were used to ground the bootstrap docs. The project should still validate live behavior through its own variable dump command because telemetry availability can vary by car, session, replay/live state, and SDK/library behavior.

| Source | URL | Notes |
| --- | --- | --- |
| pyirsdk README | https://github.com/kutu/pyirsdk | Documents Python IRSDK access to session data, live telemetry, and broadcast messages. |
| pyirsdk vars.txt | https://github.com/kutu/pyirsdk/blob/master/vars.txt | Community-maintained telemetry variable reference with examples such as Speed, FuelLevel, CarIdxLapDistPct, CarIdxPosition, CarIdxOnPitRoad, lap delta fields, inputs, weather, and pit controls. |
| IRSDKSharper GitHub | https://github.com/mherbold/IRSDKSharper | C# implementation exposing telemetry data properties, session info YAML, data header information, and calculated properties. |
| IRSDKSharper NuGet | https://www.nuget.org/packages/IRSDKSharper | Notes memory-based telemetry requires irsdkEnableMem=1 in app.ini and documents current package usage. |
| sajax iRacing SDK YAML docs | https://sajax.github.io/irsdkdocs/yaml/ | Documents the slower-changing YAML session string structures such as WeekendInfo, DriverInfo, SessionInfo, SplitTimeInfo, QualifyResultsInfo, CameraInfo, and RadioInfo. |
| SVappsLAB iRacingTelemetrySDK | https://github.com/SVappsLAB/iRacingTelemetrySDK | Explains that telemetry variable availability varies by context and recommends dumping variable/session info from live sessions. |


## Reference interpretation

- Treat community variable lists as helpful references, not guarantees.
- Always inspect the live variable catalog from the running sim.
- Build widgets around capabilities and graceful degradation.
- Keep SessionInfo YAML parsing separate from high-frequency telemetry reads.
