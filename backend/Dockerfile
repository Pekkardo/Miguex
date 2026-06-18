# ── Etapa 1: build con Maven ─────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Cache de dependencias (no fatal si la resolución offline falla)
COPY pom.xml .
RUN mvn -B -q dependency:go-offline || true

# Código y empaquetado
COPY src ./src
RUN mvn -B -q clean package -DskipTests

# ── Etapa 2: runtime ─────────────────────────────────────────────────
FROM eclipse-temurin:21-jre
WORKDIR /app

# curl para el healthcheck + usuario no root
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/* \
 && useradd -r -u 1001 spring
USER spring

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
