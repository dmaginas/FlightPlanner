using FlightPlanner.Api.Options;
using FlightPlanner.Api.Services;
using Microsoft.AspNetCore.SpaServices.StaticFiles;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

// ── Configuration ───────────────────────────────────────────────────────────
var corsOptions = builder.Configuration
    .GetSection(CorsOptions.SectionName)
    .Get<CorsOptions>() ?? new CorsOptions();

// ── Flight Plan Database options ────────────────────────────────────────────
var fpdOptions = builder.Configuration
    .GetSection(FlightPlanDatabaseOptions.SectionName)
    .Get<FlightPlanDatabaseOptions>() ?? new FlightPlanDatabaseOptions();

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
builder.Services.AddSingleton<INavDataService, NavDataService>();

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
