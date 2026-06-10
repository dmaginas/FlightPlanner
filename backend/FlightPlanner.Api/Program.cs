using FlightPlanner.Api.NavData;
using FlightPlanner.Api.Options;
using FlightPlanner.Api.Services;
using Microsoft.AspNetCore.SpaServices.StaticFiles;
using Microsoft.Extensions.FileProviders;

// ── CLI: import-cifp mode ────────────────────────────────────────────────────
// Usage:
//   dotnet run --project FlightPlanner.Api -- import-cifp <cifp-dir>
//   dotnet run --project FlightPlanner.Api -- import-cifp <cifp-dir> <navdata-dir>
// If <navdata-dir> is provided, earth_fix.dat and earth_nav.dat are read from there
// (recommended: use X-Plane's full navdata for best fix coverage).
if (args.Length >= 2 && args[0] == "import-cifp")
{
    var cifpDir  = args[1];
    var baseDir  = AppContext.BaseDirectory;
    var navDataDir = args.Length >= 3 ? args[2] : Path.Combine(baseDir, "NavData");
    var fixPath  = Path.Combine(navDataDir, "earth_fix.dat");
    var navPath  = Path.Combine(navDataDir, "earth_nav.dat");
    var dbPath   = Path.Combine(baseDir, "NavData", "procedures.sqlite");

    Console.WriteLine($"CIFP directory : {cifpDir}");
    Console.WriteLine($"Fix data from  : {navDataDir}");
    Console.WriteLine($"Output         : {dbPath}");
    Console.WriteLine();

    CifpImporter.ImportAll(cifpDir, fixPath, navPath, dbPath,
        msg => Console.WriteLine(msg));
    return;
}

var builder = WebApplication.CreateBuilder(args);

// ── Configuration ───────────────────────────────────────────────────────────
var corsOptions = builder.Configuration
    .GetSection(CorsOptions.SectionName)
    .Get<CorsOptions>() ?? new CorsOptions();

// ── Flight Plan Database options ────────────────────────────────────────────
var fpdOptions = builder.Configuration
    .GetSection(FlightPlanDatabaseOptions.SectionName)
    .Get<FlightPlanDatabaseOptions>() ?? new FlightPlanDatabaseOptions();

// ── ChartFox options ─────────────────────────────────────────────────────────
var chartFoxOptions = builder.Configuration
    .GetSection(ChartFoxOptions.SectionName)
    .Get<ChartFoxOptions>() ?? new ChartFoxOptions();

// ── Services ────────────────────────────────────────────────────────────────
builder.Services.AddControllers();

// Swagger / OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new()
    {
        Title = "FlightPlanner API",
        Version = "0.1.0",
        Description = """
            Backend API for FlightPlanner (flight simulation only).

            **METAR proxy**: fetches METAR data server-side from AviationWeather to work around
            browser CORS restrictions. AviationWeather does not set an
            Access-Control-Allow-Origin header, so direct browser requests are blocked.

            **No API key** required for AviationWeather.
            """,
    });
    options.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory,
        "FlightPlanner.Api.xml"), includeControllerXmlComments: true);
});

// CORS — origins from configuration, never wildcard *
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (corsOptions.AllowedOrigins.Length > 0)
        {
            policy.WithOrigins(corsOptions.AllowedOrigins)
                  .AllowAnyHeader()
                  .WithMethods("GET", "POST", "OPTIONS");
        }
        else
        {
            policy.WithOrigins("http://localhost:5173", "https://localhost:5173")
                  .AllowAnyHeader()
                  .WithMethods("GET", "POST", "OPTIONS");
        }
    });
});

// HttpClientFactory for AviationWeather
builder.Services.AddHttpClient<IAviationWeatherService, AviationWeatherService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(15);
    client.DefaultRequestHeaders.Add("User-Agent", "FlightPlanner/0.1.0");
});

// In-memory cache (used by FlightPlanDatabaseService)
builder.Services.AddMemoryCache();

// NavData airway routing — loads AIRAC 2012 data at startup
// Registered as singleton concrete type, then aliased to both interfaces
builder.Services.AddSingleton<NavDataService>();
builder.Services.AddSingleton<IRouteNavDataService>(sp => sp.GetRequiredService<NavDataService>());
builder.Services.AddSingleton<IMapNavDataService>(sp => sp.GetRequiredService<NavDataService>());

// Procedure repository — wraps ProcedureDatabase static class behind an interface
builder.Services.AddSingleton<IProcedureRepository, ProcedureRepository>();

// Flight Plan Database service — registered with HttpClientFactory
// ApiKey is intentionally NOT validated at startup so the app can start
// and return a clear 503 per-request if the key is missing.
builder.Services.AddSingleton(fpdOptions);
builder.Services.AddHttpClient<IFlightPlanDatabaseService, FlightPlanDatabaseService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(20);
    client.DefaultRequestHeaders.Add("User-Agent", "FlightPlanner/0.1.0");
});

// GRAMET service — fetches pressure-level weather from Open Meteo (no API key required)
builder.Services.AddHttpClient<IGrametService, GrametService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(20);
    client.DefaultRequestHeaders.Add("User-Agent", "FlightPlanner/0.1.0");
});

// NAT track service — FPD /nav/NATS endpoint, cached 15 min
// FlightPlanDatabaseOptions is resolved automatically from the DI container (registered above)
builder.Services.AddHttpClient<INatService, NatService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(15);
    client.DefaultRequestHeaders.Add("User-Agent", "FlightPlanner/0.1.0");
});

// Winds aloft service — Open Meteo pressure-level winds at cruise altitude
builder.Services.AddHttpClient<IWindsService, WindsService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
    client.DefaultRequestHeaders.Add("User-Agent", "FlightPlanner/0.1.0");
});

// SigMet/AIRMET service — AviationWeather.gov airsigmet feed, cached 5 min
builder.Services.AddHttpClient<ISigmetService, SigmetService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(15);
    client.DefaultRequestHeaders.Add("User-Agent", "FlightPlanner/0.1.0");
});

// Airspace (FIR/UIR) boundary service — vatspy-data-project GeoJSON, cached 24 h
builder.Services.AddHttpClient<IAirspaceService, AirspaceService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(60);
    client.DefaultRequestHeaders.Add("User-Agent", "FlightPlanner/0.1.0");
});

// Airport diagram service — split into focused providers (SRP)
builder.Services.AddHttpClient<IRunwayDataProvider, RunwayDataProvider>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(60);
    client.DefaultRequestHeaders.Add("User-Agent", "FlightPlanner/0.1.0");
});
builder.Services.AddHttpClient<IAtcFrequencyProvider, AtcFrequencyProvider>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(60);
    client.DefaultRequestHeaders.Add("User-Agent", "FlightPlanner/0.1.0");
});
builder.Services.AddSingleton<IIlsDataProvider, IlsDataProvider>();
builder.Services.AddScoped<IAirportDiagramService, AirportDiagramService>();

// Chart service — FAA d-TPP (US, no key) + ChartFox (worldwide, OAuth)
// Providers are tried in registration order; first non-empty result wins.
builder.Services.AddSingleton(chartFoxOptions);
builder.Services.AddHttpClient("ChartFoxAuth", client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
    client.DefaultRequestHeaders.Add("User-Agent", "FlightPlanner/0.1.0");
});
builder.Services.AddSingleton<IChartFoxTokenService, ChartFoxTokenService>();
builder.Services.AddHttpClient<FaaChartProvider>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(60);
    client.DefaultRequestHeaders.Add("User-Agent", "FlightPlanner/0.1.0");
});
builder.Services.AddHttpClient<ChartFoxProvider>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(60);
    client.DefaultRequestHeaders.Add("User-Agent", "FlightPlanner/0.1.0");
});
builder.Services.AddTransient<IChartProvider>(sp => sp.GetRequiredService<FaaChartProvider>());
builder.Services.AddTransient<IChartProvider>(sp => sp.GetRequiredService<ChartFoxProvider>());
builder.Services.AddTransient<IChartService, ChartService>();

// Route orchestration — encapsulates FPD→navdata→direct→NAT pipeline
builder.Services.AddScoped<IRouteOrchestrationService, RouteOrchestrationService>();

var app = builder.Build();

// ── Middleware pipeline ─────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "FlightPlanner API v0.1.0");
        c.RoutePrefix = "swagger";
    });
}

// UseCors() must come before UseHttpsRedirection() so that the OPTIONS preflight
// response includes CORS headers before any 301 redirect.
app.UseCors();
app.UseHttpsRedirection();

// ── Static frontend serving ─────────────────────────────────────────────────
// Development:  bin/Debug/net10.0/ → ../../../../frontend/dist
// Production:   /opt/flightplanner/frontend/dist  (copied there by deploy script)
var devPath          = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "frontend", "dist"));
var frontendDistPath = Directory.Exists(devPath)
    ? devPath
    : Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "frontend", "dist"));

if (Directory.Exists(frontendDistPath))
{
    app.UseDefaultFiles(new DefaultFilesOptions
    {
        FileProvider = new PhysicalFileProvider(frontendDistPath),
    });
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(frontendDistPath),
        RequestPath = "",
    });
}

// ── API routes ──────────────────────────────────────────────────────────────
app.MapControllers();

// ── SPA fallback for client-side routing ───────────────────────────────────
// Non-API routes serve index.html so React Router can handle them.
if (Directory.Exists(frontendDistPath))
{
    var indexPath = Path.Combine(frontendDistPath, "index.html");
    app.MapFallback(async context =>
    {
        if (!context.Request.Path.StartsWithSegments("/api"))
        {
            context.Response.ContentType = "text/html";
            await context.Response.SendFileAsync(indexPath);
        }
    });
}

app.Run();

// Makes Program visible to WebApplicationFactory in integration tests
public partial class Program { }
