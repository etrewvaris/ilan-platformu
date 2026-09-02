// lib/main.dart
import 'package:flutter/material.dart';
import 'screens/listing_detail_screen.dart';

void main() {
  runApp(const IlanPlatformuApp());
}

class IlanPlatformuApp extends StatelessWidget {
  const IlanPlatformuApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'İlan Platformu',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: const Color(0xFFFFCC00),
        useMaterial3: true,
        scaffoldBackgroundColor: Colors.white,
      ),
      // Örnek kullanım: gerçek uygulamada listeleme ekranından
      // Navigator.push ile buraya listingId parametresi geçirilir.
      home: const ListingDetailScreen(listingId: 'REPLACE_WITH_REAL_LISTING_UUID'),
    );
  }
}
