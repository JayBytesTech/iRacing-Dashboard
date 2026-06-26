using IracingEngineer.TelemetryCore.Events;
using IracingEngineer.TelemetryCore.SessionInfo;

namespace IracingEngineer.Agent;

/// <summary>
/// Turns raw <see cref="TelemetryFrame"/> + latest <see cref="SessionInfoData"/> into the
/// normalized <see cref="LiveSnapshot"/> the dashboard consumes. Pure mapping + unit conversion
/// only — no I/O, no derived strategy (that lives in the strategy engine). Keeping it pure means it
/// is unit-testable on Linux from recorded frames without iRacing.
/// </summary>
public sealed class SnapshotBuilder
{
    private readonly PrivacyConfig _privacy;
    private SessionInfoData? _session;

    public SnapshotBuilder(PrivacyConfig privacy) => _privacy = privacy;

    public void UpdateSessionInfo(SessionInfoData info) => _session = info;

    public LiveSnapshot Build(
        TelemetryFrame f,
        bool iracingConnected,
        long dataAgeMs,
        IracingEngineer.Strategy.Fuel.FuelEstimate? fuel = null,
        CoachingSnapshot? coaching = null,
        IReadOnlyList<RaceEvent>? events = null)
    {
        var connection = new ConnectionState(iracingConnected, f.IsOnTrack, f.IsReplayPlaying, dataAgeMs);

        var session = new SessionState(
            SessionId: null,
            TrackName: _session?.TrackDisplayName,
            SessionType: _session?.SessionType,
            SessionNum: f.SessionNum ?? _session?.CurrentSessionNum,
            TimeRemainingSec: f.SessionTimeRemainingSec,
            LapsRemaining: f.SessionLapsRemaining,
            FlagState: null);

        // Player car index comes from SessionInfo (DriverInfo.DriverCarIdx); fall back to 0.
        var playerCarIdx = _session?.PlayerCarIdx ?? 0;
        var player = BuildCar(playerCarIdx, f, isPlayer: true) with
        {
            SpeedKph = f.Speed is { } s ? Math.Round(s * 3.6, 1) : null, // m/s -> kph
            Gear = f.Gear,
            Rpm = f.Rpm,
            FuelLevelLiters = f.FuelLevel,
            Lap = f.Lap,
            LapCompleted = f.LapCompleted,
            LapDistPct = f.LapDistPct,
            OnPitRoad = f.OnPitRoad,
            Tires = f.Tires,
        };

        var cars = new List<CarModel>();
        var positions = f.CarIdxPosition;
        if (positions is not null)
        {
            for (var i = 0; i < positions.Count; i++)
            {
                // Filter inactive / pace-car slots in ONE place so widgets never have to.
                if (f.CarIdxLapDistPct?[i] is not { } pct || pct < 0) continue;
                if (i == playerCarIdx) continue;
                cars.Add(BuildCar(i, f, isPlayer: false));
            }
        }

        // Tank-aware stint plan: needs the car's usable tank (from SessionInfo) plus a burn rate and
        // race-laps-to-go (from the fuel estimate). Only meaningful for races longer than one tank.
        IracingEngineer.Strategy.Fuel.StintPlan? stintPlan = null;
        if (fuel is { FuelBurnPerLapLiters: { } burn, RaceLapsToGo: { } lapsToGo }
            && _session?.UsableFuelLiters is { } usableTank
            && f.FuelLevel is { } fuelNow)
        {
            stintPlan = IracingEngineer.Strategy.Fuel.StintPlanner.Plan(burn, fuelNow, usableTank, lapsToGo);
        }

        var strategy = fuel is null && stintPlan is null ? null : new { fuel, stintPlan };
        var eventList = events is { Count: > 0 } ? (IReadOnlyList<object>)events : Array.Empty<object>();
        return new LiveSnapshot(connection, session, player, cars, strategy, Events: eventList, Coaching: coaching);
    }

    private CarModel BuildCar(int carIdx, TelemetryFrame f, bool isPlayer)
    {
        SessionDriver? driver = null;
        if (_session?.DriversByCarIdx.TryGetValue(carIdx, out var d) == true) driver = d;
        var name = driver?.DriverName;
        if (_privacy.MaskDriverNames) name = name is null ? null : $"Driver #{carIdx}";

        return new CarModel(
            CarIdx: carIdx,
            CarNumber: driver?.CarNumber,
            DriverName: name,
            TeamName: driver?.TeamName,
            ClassName: driver?.ClassName,
            Position: At(f.CarIdxPosition, carIdx),
            ClassPosition: At(f.CarIdxClassPosition, carIdx),
            Lap: At(f.CarIdxLap, carIdx),
            LapCompleted: At(f.CarIdxLapCompleted, carIdx),
            LapDistPct: At(f.CarIdxLapDistPct, carIdx),
            EstTimeToCurrentLocationSec: At(f.CarIdxEstTime, carIdx),
            OnPitRoad: At(f.CarIdxOnPitRoad, carIdx),
            IsPlayer: isPlayer);
    }

    private static T? At<T>(IReadOnlyList<T>? arr, int i) => arr is not null && i >= 0 && i < arr.Count ? arr[i] : default;
}
