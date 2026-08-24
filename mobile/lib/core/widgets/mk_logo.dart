import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../constants/app_constants.dart';

class MkLogo extends StatelessWidget {
  final double size;
  final double? fontSize;
  final bool showText;
  final bool isVertical;
  final String? subtitle;
  final Color? titleColor;
  final Color? subtitleColor;
  final bool hasGlow;
  final double spacing;
  final bool useAssetImage;

  const MkLogo({
    super.key,
    this.size = 48,
    this.fontSize,
    this.showText = false,
    this.isVertical = false,
    this.subtitle,
    this.titleColor,
    this.subtitleColor,
    this.hasGlow = true,
    this.spacing = 12,
    this.useAssetImage = true,
  });

  @override
  Widget build(BuildContext context) {
    final double calculatedFontSize = fontSize ?? (size * 0.42);
    final double borderRadius = size * 0.28;

    Widget badgeContent;
    if (useAssetImage) {
      badgeContent = Image.asset(
        'assets/images/moneylink_logo_mark.png',
        width: size,
        height: size,
        fit: BoxFit.contain,
        errorBuilder: (context, error, stackTrace) => _buildVectorBadge(calculatedFontSize),
      );
    } else {
      badgeContent = _buildVectorBadge(calculatedFontSize);
    }

    final badge = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(borderRadius),
        boxShadow: hasGlow
            ? [
                BoxShadow(
                  color: const Color(0xFF00A86B).withValues(alpha: 0.35),
                  blurRadius: size * 0.4,
                  offset: Offset(0, size * 0.15),
                ),
              ]
            : null,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: badgeContent,
      ),
    );

    if (!showText && subtitle == null) {
      return badge;
    }

    if (isVertical) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          badge,
          SizedBox(height: spacing),
          if (showText)
            Text(
              'MoneyLink',
              style: GoogleFonts.outfit(
                fontSize: (size * 0.4).clamp(20.0, 36.0),
                fontWeight: FontWeight.bold,
                color: titleColor ?? Colors.white,
                letterSpacing: -0.5,
              ),
            ),
          if (subtitle != null) ...[
            const SizedBox(height: 6),
            Text(
              subtitle!,
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                fontSize: (size * 0.17).clamp(12.0, 15.0),
                color: subtitleColor ?? Colors.white.withValues(alpha: 0.75),
                fontWeight: FontWeight.w400,
              ),
            ),
          ],
        ],
      );
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        badge,
        SizedBox(width: spacing),
        Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (showText)
              Text(
                'MoneyLink',
                style: GoogleFonts.outfit(
                  fontSize: (size * 0.52).clamp(18.0, 26.0),
                  fontWeight: FontWeight.bold,
                  color: titleColor ?? AppConstants.textPrimary,
                  letterSpacing: -0.5,
                ),
              ),
            if (subtitle != null)
              Text(
                subtitle!,
                style: GoogleFonts.inter(
                  fontSize: 12,
                  color: subtitleColor ?? AppConstants.textSecondary,
                ),
              ),
          ],
        ),
      ],
    );
  }

  Widget _buildVectorBadge(double calculatedFontSize) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF00C48C), // Vert Émeraude FinTech Lumineux
            Color(0xFF007A4D), // Vert Émeraude Profond
          ],
        ),
        borderRadius: BorderRadius.circular(size * 0.28),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.25),
          width: (size * 0.03).clamp(1.0, 3.0),
        ),
      ),
      child: Center(
        child: Text(
          'MK',
          style: GoogleFonts.outfit(
            fontSize: calculatedFontSize,
            fontWeight: FontWeight.w800,
            color: Colors.white,
            letterSpacing: -1.0,
            height: 1.0,
          ),
        ),
      ),
    );
  }
}
