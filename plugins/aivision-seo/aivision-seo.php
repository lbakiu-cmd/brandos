<?php
/**
 * Plugin Name: AIVision SEO
 * Plugin URI:  https://aivisionseo.com
 * Description: All-in-one SEO, AEO & GEO optimization plugin — score and optimize your content for search engines (Google/Bing), answer engines (snippets/voice), and generative AI (OpenAI ChatGPT & Google Gemini). Includes auto-optimized robots.txt, dynamic /llms.txt, and schema generator.
 * Version:     1.6.5
 * Author:      AIVision SEO
 * License:     GPL-2.0-or-later
 * Text Domain: aivision-seo
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'AIVISION_VERSION',  '1.6.5' );
define( 'AIVISION_FILE',     __FILE__ );
define( 'AIVISION_BASENAME', plugin_basename( __FILE__ ) );
define( 'AIVISION_DIR',      plugin_dir_path( __FILE__ ) );
define( 'AIVISION_URL',      plugin_dir_url( __FILE__ ) );
define( 'AIVISION_META_KEY', '_aivision_seo' );

// ── Autoload classes ──────────────────────────────────────────────────────────
require_once AIVISION_DIR . 'includes/class-analyzer.php';
require_once AIVISION_DIR . 'includes/class-schema.php';
require_once AIVISION_DIR . 'includes/class-robots.php';
require_once AIVISION_DIR . 'includes/class-sitemap.php';
require_once AIVISION_DIR . 'includes/class-llms-txt.php';
require_once AIVISION_DIR . 'includes/class-integration.php';
require_once AIVISION_DIR . 'includes/class-updater.php';
require_once AIVISION_DIR . 'admin/class-admin.php';
require_once AIVISION_DIR . 'admin/class-metabox.php';

// ── Boot ──────────────────────────────────────────────────────────────────────
add_action( 'plugins_loaded', function () {
    AIVision_Admin::init();
    AIVision_Metabox::init();
    AIVision_Robots::init();
    AIVision_Sitemap::init();
    AIVision_LLMsTxt::init();
    AIVisibility_Integration::init();
    AIVision_Updater::init();

    // Remove WordPress generator meta tag if enabled
    $settings = get_option( 'aivision_settings', [] );
    if ( ! empty( $settings['remove_default_generator'] ) ) {
        remove_action( 'wp_head', 'wp_generator' );
    }
} );

// ── Front-end: inject site-wide JSON-LD (LocalBusiness/Organization/FAQ) ─────
// Written by the "set_schema" 1-Click Fix (REST apply-fix), which previously
// only saved global_schema_data/global_schema_type to settings with nothing
// ever reading them back out -- this is what actually publishes that schema.
// Runs on every page (not gated to is_singular()) since this schema describes
// the business/site, not a specific post.
add_action( 'wp_head', 'aivision_inject_global_schema', 1 );
function aivision_inject_global_schema() {
    $settings = get_option( 'aivision_settings', [] );
    $schemas  = $settings['global_schemas'] ?? null;

    // Fall back to the single legacy key for settings saved before schemas were
    // stored as a keyed collection (see class-integration.php::rest_apply_fix).
    if ( empty( $schemas ) || ! is_array( $schemas ) ) {
        $legacy  = $settings['global_schema_data'] ?? null;
        $schemas = ( ! empty( $legacy ) && is_array( $legacy ) ) ? [ $legacy ] : [];
    }

    foreach ( $schemas as $schema_data ) {
        if ( empty( $schema_data ) || ! is_array( $schema_data ) ) continue;
        echo '<script type="application/ld+json">' . wp_json_encode( $schema_data ) . "</script>\n";
    }
}

// ── Front-end: inject meta tags + JSON-LD ────────────────────────────────────
add_action( 'wp_head', 'aivision_inject_head', 1 );
function aivision_inject_head() {
    if ( ! is_singular() ) return;

    $post_id = get_the_ID();
    $data    = get_post_meta( $post_id, AIVISION_META_KEY, true );
    if ( ! is_array( $data ) ) $data = [];

    $settings       = get_option( 'aivision_settings', [] );
    $default_robots = ! empty( $settings['default_robots'] ) ? $settings['default_robots'] : 'index, follow';

    $title        = ! empty( $data['meta_title'] )       ? $data['meta_title']       : get_the_title( $post_id );
    $description  = ! empty( $data['meta_description'] ) ? $data['meta_description'] : '';
    $keywords     = ! empty( $data['focus_keyword'] )    ? $data['focus_keyword']     : '';
    $robots       = ! empty( $data['meta_robots'] )      ? $data['meta_robots']      : $default_robots;
    $canonical    = ! empty( $data['canonical'] )        ? $data['canonical']        : get_permalink( $post_id );
    $og_img       = ! empty( $data['og_image'] )         ? $data['og_image']         : ( get_the_post_thumbnail_url( $post_id, 'large' ) ?: '' );
    $card_type    = ! empty( $data['twitter_card'] )     ? $data['twitter_card']     : 'summary_large_image';

    echo "\n<!-- AIVision SEO, AEO & GEO -->\n";
    if ( ! current_theme_supports( 'title-tag' ) && $title ) echo '<title>' . esc_html( $title ) . "</title>\n";
    if ( $description ) echo '<meta name="description" content="' . esc_attr( $description ) . "\">\n";
    if ( $keywords )    echo '<meta name="keywords" content="' . esc_attr( $keywords ) . "\">\n";
    if ( $robots )      echo '<meta name="robots" content="' . esc_attr( $robots ) . "\">\n";
    if ( $canonical )   echo '<link rel="canonical" href="' . esc_url( $canonical ) . "\">\n";

    // OpenGraph
    echo '<meta property="og:title" content="' . esc_attr( $title ) . "\">\n";
    if ( $description ) echo '<meta property="og:description" content="' . esc_attr( $description ) . "\">\n";
    echo '<meta property="og:url" content="' . esc_url( $canonical ) . "\">\n";
    echo '<meta property="og:type" content="' . ( is_single() ? 'article' : 'website' ) . "\">\n";
    if ( $og_img )      echo '<meta property="og:image" content="' . esc_url( $og_img ) . "\">\n";

    // Twitter Card
    echo '<meta name="twitter:card" content="' . esc_attr( $card_type ) . "\">\n";
    echo '<meta name="twitter:title" content="' . esc_attr( $title ) . "\">\n";
    if ( $description ) echo '<meta name="twitter:description" content="' . esc_attr( $description ) . "\">\n";
    if ( $og_img )      echo '<meta name="twitter:image" content="' . esc_url( $og_img ) . "\">\n";

    // Schemas (JSON-LD)
    if ( ! empty( $data['schemas'] ) && is_array( $data['schemas'] ) ) {
        foreach ( $data['schemas'] as $schema ) {
            if ( ! empty( $schema['json'] ) ) {
                echo '<script type="application/ld+json">' . "\n" . $schema['json'] . "\n</script>\n";
            }
        }
    }
    echo "<!-- /AIVision SEO -->\n\n";
}

// ── Auto Title Filter ─────────────────────────────────────────────────────────
add_filter( 'pre_get_document_title', 'aivision_filter_title', 20 );
function aivision_filter_title( $title ) {
    if ( ! is_singular() ) return $title;
    $meta = get_post_meta( get_the_ID(), AIVISION_META_KEY, true );
    if ( ! empty( $meta['meta_title'] ) ) {
        return $meta['meta_title'];
    }
    return $title;
}

// ── Activation / Deactivation ────────────────────────────────────────────────
register_activation_hook( __FILE__, 'aivision_activate' );
function aivision_activate() {
    $settings = get_option( 'aivision_settings', [] );
    $defaults = [
        'ai_crawlers_enabled' => true,
        'site_type'           => 'general',
        'default_robots'      => 'index, follow',
        'allowed_bots'        => AIVision_Robots::OPTIMAL_ALLOWED_BOTS,
    ];

    $updated = false;
    foreach ( $defaults as $key => $val ) {
        if ( ! isset( $settings[$key] ) || ( $key === 'allowed_bots' && empty( $settings[$key] ) ) ) {
            $settings[$key] = $val;
            $updated = true;
        }
    }

    if ( $updated ) {
        update_option( 'aivision_settings', $settings );
    }

    require_once plugin_dir_path( __FILE__ ) . 'includes/class-robots.php';
    require_once plugin_dir_path( __FILE__ ) . 'includes/class-sitemap.php';
    require_once plugin_dir_path( __FILE__ ) . 'includes/class-llms-txt.php';
    AIVision_Sitemap::add_rewrite_rules();
    AIVision_LLMsTxt::add_rewrite_rules();
    flush_rewrite_rules();

    // Auto-sync physical files
    AIVision_Robots::write_physical_robots();
    AIVision_LLMsTxt::auto_sync();

    // Clear legacy autopilot cron if scheduled
    wp_clear_scheduled_hook( 'aivision_autopilot_cron_hook' );
}

register_deactivation_hook( __FILE__, 'aivision_deactivate' );
function aivision_deactivate() {
    wp_clear_scheduled_hook( 'aivision_autopilot_cron_hook' );
    flush_rewrite_rules();
}
