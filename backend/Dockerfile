FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and project files for restore
COPY AutoVeo.sln .
COPY src/AutoVeo.Api/AutoVeo.Api.csproj src/AutoVeo.Api/
COPY src/AutoVeo.Application/AutoVeo.Application.csproj src/AutoVeo.Application/
COPY src/AutoVeo.Domain/AutoVeo.Domain.csproj src/AutoVeo.Domain/
COPY src/AutoVeo.Infrastructure/AutoVeo.Infrastructure.csproj src/AutoVeo.Infrastructure/
COPY src/AutoVeo.Shared/AutoVeo.Shared.csproj src/AutoVeo.Shared/
RUN dotnet restore

# Copy everything and build
COPY . .
RUN dotnet publish src/AutoVeo.Api/AutoVeo.Api.csproj -c Release -o /app/publish --no-restore

# Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Create logs directory
RUN mkdir -p /app/logs

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "AutoVeo.Api.dll"]
