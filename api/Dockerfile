FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 5124

ENV ASPNETCORE_URLS=http://+:5124

USER app
FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:8.0 AS build
ARG configuration=Release
WORKDIR /src
COPY ["PreOrderApp.csproj", "./"]
RUN dotnet restore "PreOrderApp.csproj"
COPY . .
WORKDIR "/src/."
RUN dotnet build "PreOrderApp.csproj" -c $configuration -o /app/build

FROM build AS publish
ARG configuration=Release
RUN dotnet publish "PreOrderApp.csproj" -c $configuration -o /app/publish /p:UseAppHost=false --no-incremental

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "PreOrderApp.dll"]
