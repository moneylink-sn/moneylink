import 'package:intl/intl.dart';

class Formatters {
  static final NumberFormat _fcfaFormat = NumberFormat('#,##0', 'fr_FR');

  /// Formate un montant en FCFA (ex: "45 000 FCFA")
  static String formatFCFA(dynamic amount) {
    if (amount == null) return '0 FCFA';
    final val = double.tryParse(amount.toString()) ?? 0.0;
    return '${_fcfaFormat.format(val)} FCFA';
  }

  /// Formate une date ISO (ex: "24 Août 2026, 14:30")
  static String formatDate(String? isoString) {
    if (isoString == null) return '';
    try {
      final date = DateTime.parse(isoString);
      return DateFormat('dd MMM yyyy, HH:mm', 'fr_FR').format(date);
    } catch (_) {
      return isoString;
    }
  }

  /// Formate une date courte (ex: "24/08/2026")
  static String formatDateShort(String? isoString) {
    if (isoString == null) return '';
    try {
      final date = DateTime.parse(isoString);
      return DateFormat('dd/MM/yyyy').format(date);
    } catch (_) {
      return isoString;
    }
  }

  /// Masque un numéro de téléphone pour la sécurité (ex: "+221 77 ••• •• 04")
  static String maskPhone(String? phone) {
    if (phone == null || phone.length < 8) return phone ?? '';
    final visibleStart = phone.substring(0, 7);
    final visibleEnd = phone.substring(phone.length - 2);
    return '$visibleStart ••• •• $visibleEnd';
  }
}
