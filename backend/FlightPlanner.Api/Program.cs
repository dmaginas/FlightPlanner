using FlightPlanner.Api.Options;
using FlightPlanner.Api.Services;
using Microsoft.AspNetCore.SpaServices.StaticFiles;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

// ── Konfiguration ───────────────────────────────────────────────────────────
var corsOptions = builder.Configuration
    .GetSection(CorsOptions.SectionName)
    .Get<CorsOptions>() ?? new CorsOptions();

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
            Backend-API für FlightPlanner (nur für Flugsimulation).

            **METAR-Proxy**: Ruft METAR-Daten serverseitig von AviationWeather ab, um den
            Browser-CORS-Fehler zu umgehen. AviationWeather setzt keinen
            Access-Control-Allow-Origin-Header, daher sind direkte Browser-Requests blockiert.

            **Kein API-Key** für AviationWeather erforderlich.
            """,
    });
    options.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory,
        "FlightPlanner.Api.xml"), includeControllerXmlComments: true);
});

// CORS — Origins aus Konfiguration, nie pauschal *
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (corsOptions.AllowedOrigins.Length > 0)
        {
            policy.WithOrigins(corsOptions.AllowedOrigins)
                  .AllowAnyHeader()
                  .WithMethods("GET");
        }
        else
        {
            // Sicherer Fallback: kein Origin erlaubt, statt * zu verwenden
            policy.WithOrigins("http://localhost:5173")
                  .AllowAnyHeader()
                  .WithMethods("GET");
        }
    });
});

// HttpClientFactory für AviationWeather
builder.Services.AddHttpClient<IAviationWeatherService, AviationWeatherService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(15);
    client.DefaultRequestHeaders.Add("User-Agent", "FlightPlanner/0.1.0");
});

var app = builder.Build();

// ── Middleware-Pipeline ─────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "FlightPlanner API v0.1.0");
        c.RoutePrefix = "swagger";
    });
}

app.UseHttpsRedirection();
app.UseCors();

// ── Statisches Frontend-Serving (Block 4) ───────────────────────────────────
// In Produktion liefert das Backend das gebaute Vite-Frontend aus frontend/dist.
// frontend/dist liegt relativ zum Repository-Root, das Backend liegt in backend/.
var frontendDistPath = Path.GetFullPath(
    Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "frontend", "dist"));

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

// ── API-Routen ──────────────────────────────────────────────────────────────
app.MapControllers();

// ── SPA-Fallback für Client-Side-Routing ───────────────────────────────────
// Nicht-API-Routen liefern index.html zurück, damit React-Router funktioniert.
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

// Macht die Program-Klasse für WebApplicationFactory in Tests sichtbar
public partial class Program { }
