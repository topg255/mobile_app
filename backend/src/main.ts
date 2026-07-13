import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('API Qualité - Gestion de la Qualité')
    .setDescription(
      'API backend pour la gestion de la qualité.\n\n' +
      '## Acteurs\n' +
      '- **Super Admin** : Gestion complète de la plateforme, approbation des comptes, logs\n' +
      '- **Superviseur Qualité** : Supervision complète, accès à tous les agents et historiques\n' +
      '- **Agent Qualité** : Accès limité à ses propres données\n\n' +
      '## Authentification\n' +
      'Toutes les routes protégées nécessitent un token JWT dans le header `Authorization: Bearer <token>`.\n\n' +
      '**Important :** Les agents et superviseurs doivent être approuvés par le Super Admin avant de pouvoir se connecter.\n\n' +
      '## Fonctionnalités\n' +
      '### Auth\n' +
      '1. **Inscription** : Créer un compte (superviseur ou agent) - En attente d\'approbation\n' +
      '2. **Connexion** : Obtenir un token JWT (compte approuvé requis)\n' +
      '3. **Mot de passe oublié** : Recevoir un email de réinitialisation\n' +
      '4. **Réinitialisation** : Définir un nouveau mot de passe\n\n' +
      '### Contrôle Qualité\n' +
      '5. **Dates de contrôle** : Créer et lister les dates de contrôle\n' +
      '6. **Lignes de contrôle** : Ajouter des lignes (note, délai, responsable, détails)\n' +
      '7. **Rapport** : Générer un rapport avec répartition % et minutes d\'arrêt cumulées\n' +
      '8. **Historique** : Superviseur peut voir l\'historique de chaque agent\n\n' +
      '### Super Admin\n' +
      '9. **Gestion des utilisateurs** : Voir, approuver, désapprouver, supprimer\n' +
      '10. **Logs** : Historique complet des connexions/déconnexions avec date et heure\n' +
      '11. **Statistiques** : Vue d\'ensemble de la plateforme',
    )
    .setVersion('1.0')
    .addTag('Auth', "Endpoints d'authentification : inscription, connexion, réinitialisation du mot de passe")
    .addTag('Profile', 'Gestion du profil utilisateur connecté')
    .addTag('Quality - Contrôle Qualité', 'Gestion des dates de contrôle, lignes et rapports qualité')
    .addTag('Super Admin', 'Gestion des utilisateurs, approbation, logs et statistiques')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Entrez le token JWT obtenu lors de la connexion',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'API Qualité - Documentation',
    customfavIcon: 'https://nestjs.com/img/logo_text.svg',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      tagsSorter: 'alpha',
    },
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application running on: http://localhost:${process.env.PORT ?? 3000}`);
  console.log(`Swagger documentation: http://localhost:${process.env.PORT ?? 3000}/api/docs`);
}
bootstrap();
