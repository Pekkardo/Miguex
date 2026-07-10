package com.miguex.dashboard.config;

import jakarta.persistence.EntityManagerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.boot.orm.jpa.EntityManagerFactoryBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.transaction.PlatformTransactionManager;

import javax.sql.DataSource;
import java.util.Map;

/**
 * Datasource principal del tablero (MySQL {@code dashboard}): llamadas, chats, matrículas, etc.
 * Se declara explícitamente —en vez de dejar la autoconfiguración— porque el cruce de
 * matrículas x ventas agrega una segunda base de datos ({@link com.miguex.dashboard.cruce.config.CruceDbConfig})
 * y, con más de un datasource, Spring necesita saber cuál es el primario. Escanea sólo las
 * entidades de {@code com.miguex.dashboard.model} y los repos de {@code com.miguex.dashboard.repo}.
 */
@Configuration
@EnableJpaRepositories(
        basePackages = "com.miguex.dashboard.repo",
        entityManagerFactoryRef = "mainEntityManagerFactory",
        transactionManagerRef = "mainTransactionManager")
public class MainDbConfig {

    @Primary
    @Bean
    public DataSource mainDataSource(
            @Value("${spring.datasource.url}") String url,
            @Value("${spring.datasource.username:dashboard}") String username,
            @Value("${spring.datasource.password:dashboard}") String password,
            @Value("${spring.datasource.driver-class-name:com.mysql.cj.jdbc.Driver}") String driver) {
        return DataSourceBuilder.create()
                .url(url).username(username).password(password).driverClassName(driver)
                .build();
    }

    @Primary
    @Bean
    public LocalContainerEntityManagerFactoryBean mainEntityManagerFactory(
            EntityManagerFactoryBuilder builder,
            @Qualifier("mainDataSource") DataSource dataSource,
            @Value("${spring.jpa.hibernate.ddl-auto:update}") String ddlAuto,
            @Value("${spring.jpa.properties.hibernate.dialect:org.hibernate.dialect.MySQLDialect}") String dialect) {
        return builder
                .dataSource(dataSource)
                .packages("com.miguex.dashboard.model")
                .persistenceUnit("main")
                .properties(Map.of(
                        "hibernate.hbm2ddl.auto", ddlAuto,
                        "hibernate.dialect", dialect))
                .build();
    }

    @Primary
    @Bean
    public PlatformTransactionManager mainTransactionManager(
            @Qualifier("mainEntityManagerFactory") EntityManagerFactory emf) {
        return new JpaTransactionManager(emf);
    }
}
