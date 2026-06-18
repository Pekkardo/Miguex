package com.miguex.dashboard.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Proxy hacia la API de Anthropic. La API key vive en el backend
 * (variable de entorno ANTHROPIC_API_KEY), nunca en el navegador.
 */
@Service
public class ChatService {

    private static final String API_URL = "https://api.anthropic.com/v1/messages";
    private static final String ANTHROPIC_VERSION = "2023-06-01";

    private final String apiKey;
    private final String model;
    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    public ChatService(
            @Value("${anthropic.api-key:}") String apiKey,
            @Value("${anthropic.model:claude-sonnet-4-6}") String model) {
        this.apiKey = apiKey;
        this.model = model;
    }

    public boolean isEnabled() {
        return apiKey != null && !apiKey.isBlank();
    }

    public String chat(String system, String userMessage) throws Exception {
        if (!isEnabled()) {
            return "El chat con IA no está configurado. Definí la variable ANTHROPIC_API_KEY "
                    + "en el backend para habilitarlo.";
        }

        ObjectNode body = mapper.createObjectNode();
        body.put("model", model);
        body.put("max_tokens", 1000);
        if (system != null && !system.isBlank()) {
            body.put("system", system);
        }
        ArrayNode messages = body.putArray("messages");
        ObjectNode msg = messages.addObject();
        msg.put("role", "user");
        msg.put("content", userMessage == null ? "" : userMessage);

        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(API_URL))
                .timeout(Duration.ofSeconds(60))
                .header("Content-Type", "application/json")
                .header("x-api-key", apiKey)
                .header("anthropic-version", ANTHROPIC_VERSION)
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                .build();

        HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() / 100 != 2) {
            throw new RuntimeException("Anthropic API " + res.statusCode() + ": " + res.body());
        }

        JsonNode root = mapper.readTree(res.body());
        JsonNode content = root.path("content");
        StringBuilder sb = new StringBuilder();
        if (content.isArray()) {
            for (JsonNode block : content) {
                sb.append(block.path("text").asText(""));
            }
        }
        String reply = sb.toString();
        return reply.isBlank() ? "Sin respuesta." : reply;
    }
}
