using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using AgroServer.Hubs;
using AgroServer.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;

Console.WriteLine("HELLO THERE!");

var builder = WebApplication.CreateBuilder(args);

const string Origins = "_AgroEcoSim";

var origins = builder.Configuration["AGRO_HOSTNAME"] ?? "http://localhost:8080";
builder.Services.AddCors(o => o.AddPolicy(name: Origins, p =>
    p.WithOrigins(origins)
    //p.AllowAnyOrigin()
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()
));
//.SetIsOriginAllowedToAllowWildcardSubdomains()
//.WithMethods("GET", "POST", "OPTIONS").AllowAnyHeader().AllowCredentials().Build()

builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenLocalhost(7215); // HTTP only
});

builder.WebHost.UseUrls("http://localhost:7215");

// Add services to the container.
builder.Services.AddSingleton<ISimulationUploadService>(new SimulationUploadService());
builder.Services.AddSingleton<ITerrainBuffer>(new TerrainBuffer());
builder.Services.AddControllers();

builder.Services.AddSignalR(options => {
    options.MaximumParallelInvocationsPerClient = 3;
});

builder.Configuration.AddEnvironmentVariables(prefix: "AGRO_");

var app = builder.Build();
app.UseCors(Origins);
app.MapHub<SimulationHub>("/SimSocket").RequireCors(Origins);
app.MapControllers();
app.Run();