<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * AIVision SEO Automatic Remote Updater
 *
 * Integrates directly with WordPress Core Update API:
 * 1. Checks https://icandothat.online/api/wordpress/plugin-versions
 * 2. Displays available updates in wp-admin/plugins.php and admin header notices
 * 3. Supports 1-click automatic background updates via WordPress Core Upgrader
 * 4. Provides plugin details and changelogs in the WordPress update modal
 */
class AIVision_Updater {

    const UPDATE_API_URL = 'https://icandothat.online/api/wordpress/plugin-versions';
    const DOWNLOAD_URL   = 'https://icandothat.online/api/wordpress/plugin-download';
    const PLUGIN_SLUG    = 'aivision-seo';

    public static function init() {
        // WordPress update transients
        add_filter( 'pre_set_site_transient_update_plugins', [ __CLASS__, 'check_update' ] );
        add_filter( 'site_transient_update_plugins',         [ __CLASS__, 'check_update' ] );

        // View version details modal
        add_filter( 'plugins_api', [ __CLASS__, 'plugin_info' ], 20, 3 );

        // Allow automatic background updates via WP-Cron
        add_filter( 'auto_update_plugin', [ __CLASS__, 'maybe_auto_update' ], 10, 2 );

        // Clear transient caches post-update
        add_action( 'upgrader_process_complete', [ __CLASS__, 'after_update' ], 10, 2 );

        // Admin notice inside AIVision pages if update is available
        add_action( 'admin_notices', [ __CLASS__, 'admin_notice_update' ] );

        // AJAX 1-click check for updates
        add_action( 'wp_ajax_aivision_check_update', [ __CLASS__, 'ajax_check_update' ] );
    }

    /**
     * Get plugin basename e.g. aivision-seo/aivision-seo.php
     */
    public static function get_plugin_basename() {
        return defined( 'AIVISION_BASENAME' ) ? AIVISION_BASENAME : plugin_basename( AIVISION_FILE );
    }

    /**
     * Fetch remote version metadata from AIVisibility SEO Cloud
     */
    public static function get_remote_version( $force = false ) {
        $cache_key = 'aivision_remote_update_info';
        if ( ! $force ) {
            $cached = get_transient( $cache_key );
            if ( false !== $cached && is_array( $cached ) ) {
                return $cached;
            }
        }

        $response = wp_remote_get( self::UPDATE_API_URL, [
            'timeout' => 10,
            'headers' => [
                'Accept'     => 'application/json',
                'User-Agent' => 'WordPress/' . get_bloginfo( 'version' ) . '; ' . home_url(),
            ],
        ] );

        if ( is_wp_error( $response ) || 200 !== wp_remote_retrieve_response_code( $response ) ) {
            return false;
        }

        $body = json_decode( wp_remote_retrieve_body( $response ), true );
        if ( is_array( $body ) && ! empty( $body['latest'] ) ) {
            // Cache for 6 hours
            set_transient( $cache_key, $body, 6 * HOUR_IN_SECONDS );
            return $body;
        }

        return false;
    }

    /**
     * Hook into WordPress update check filter
     */
    public static function check_update( $transient ) {
        if ( empty( $transient ) || ! is_object( $transient ) ) {
            return $transient;
        }

        $remote = self::get_remote_version();
        if ( ! $remote || empty( $remote['latest'] ) ) {
            return $transient;
        }

        $basename = self::get_plugin_basename();
        $latest_version = $remote['latest'];

        if ( version_compare( AIVISION_VERSION, $latest_version, '<' ) ) {
            $latest_meta = $remote['versions'][0] ?? [];
            $package_url = ! empty( $latest_meta['filename'] )
                ? 'https://icandothat.online/' . $latest_meta['filename']
                : self::DOWNLOAD_URL;

            $obj = new stdClass();
            $obj->slug        = self::PLUGIN_SLUG;
            $obj->plugin      = $basename;
            $obj->new_version = $latest_version;
            $obj->url         = 'https://icandothat.online';
            $obj->package     = $package_url;
            $obj->tested      = $latest_meta['minWp'] ?? '6.5';
            $obj->requires    = $latest_meta['minWp'] ?? '6.0';
            $obj->requires_php= $latest_meta['minPhp'] ?? '8.0';
            $obj->icons       = [
                'default' => 'https://icandothat.online/icon.png',
                '1x'      => 'https://icandothat.online/icon.png',
                '2x'      => 'https://icandothat.online/icon.png',
            ];
            $obj->banners     = [
                'default' => 'https://icandothat.online/og-image.png',
                'low'     => 'https://icandothat.online/icon.png',
                'high'    => 'https://icandothat.online/og-image.png',
            ];

            $transient->response[ $basename ] = $obj;
            if ( isset( $transient->no_update[ $basename ] ) ) {
                unset( $transient->no_update[ $basename ] );
            }
        } else {
            $obj = new stdClass();
            $obj->slug        = self::PLUGIN_SLUG;
            $obj->plugin      = $basename;
            $obj->new_version = AIVISION_VERSION;
            $obj->url         = 'https://icandothat.online';
            $obj->package     = '';
            $transient->no_update[ $basename ] = $obj;
            if ( isset( $transient->response[ $basename ] ) ) {
                unset( $transient->response[ $basename ] );
            }
        }

        return $transient;
    }

    /**
     * Hook into WordPress plugins_api for modal details
     */
    public static function plugin_info( $res, $action, $args ) {
        if ( 'plugin_information' !== $action || empty( $args->slug ) || $args->slug !== self::PLUGIN_SLUG ) {
            return $res;
        }

        $remote = self::get_remote_version();
        if ( ! $remote || empty( $remote['latest'] ) ) {
            return $res;
        }

        $latest_meta = $remote['versions'][0] ?? [];
        $changelog_items = $latest_meta['changelog'] ?? [];
        $changelog_html  = '<ul style="list-style:disc; margin-left:20px; line-height:1.6;">';
        foreach ( $changelog_items as $item ) {
            $changelog_html .= '<li>' . esc_html( $item ) . '</li>';
        }
        $changelog_html .= '</ul>';

        $info = new stdClass();
        $info->name           = 'AIVision SEO';
        $info->slug           = self::PLUGIN_SLUG;
        $info->version        = $remote['latest'];
        $info->author         = '<a href="https://icandothat.online" target="_blank">AIVisibility SEO</a>';
        $info->homepage       = 'https://icandothat.online';
        $info->requires       = $latest_meta['minWp'] ?? '6.0';
        $info->tested         = '6.5';
        $info->requires_php   = $latest_meta['minPhp'] ?? '8.0';
        $info->download_link  = self::DOWNLOAD_URL;
        $info->trunk          = self::DOWNLOAD_URL;
        $info->last_updated   = $latest_meta['releasedAt'] ?? date('Y-m-d');
        $info->sections       = [
            'description' => '<p>All-in-one SEO, AEO &amp; GEO optimization plugin — score and optimize your content for search engines (Google/Bing), answer engines (snippets/voice), and generative AI (OpenAI ChatGPT &amp; Google Gemini). Includes auto-optimized robots.txt, dynamic /llms.txt, schema generator, and cloud sync.</p>',
            'changelog'   => $changelog_html,
        ];
        $info->banners        = [
            'low'  => 'https://icandothat.online/icon.png',
            'high' => 'https://icandothat.online/icon.png',
        ];

        return $info;
    }

    /**
     * Enable auto-update by default if requested
     */
    public static function maybe_auto_update( $update, $item ) {
        if ( isset( $item->slug ) && $item->slug === self::PLUGIN_SLUG ) {
            return true;
        }
        return $update;
    }

    /**
     * Clear caches post-update
     */
    public static function after_update( $upgrader_object, $options ) {
        if ( isset( $options['action'], $options['type'] ) && $options['action'] === 'update' && $options['type'] === 'plugin' ) {
            $basename = self::get_plugin_basename();
            if ( isset( $options['plugins'] ) && in_array( $basename, $options['plugins'], true ) ) {
                delete_transient( 'aivision_remote_update_info' );
                delete_site_transient( 'update_plugins' );
            }
        }
    }

    /**
     * Admin notice on AIVision admin pages
     */
    public static function admin_notice_update() {
        $screen = get_current_screen();
        if ( ! $screen || strpos( $screen->id, 'aivision' ) === false ) {
            return;
        }

        $remote = self::get_remote_version();
        if ( ! $remote || empty( $remote['latest'] ) || ! version_compare( AIVISION_VERSION, $remote['latest'], '<' ) ) {
            return;
        }

        $basename   = self::get_plugin_basename();
        $update_url = wp_nonce_url(
            self_admin_url( 'update.php?action=upgrade-plugin&plugin=' . urlencode( $basename ) ),
            'upgrade-plugin_' . $basename
        );

        echo '<div class="notice notice-info is-dismissible" style="background:#0f172a; color:#fff; border-left:4px solid #3b82f6; border-radius:8px; padding:12px 18px; margin:16px 0; display:flex; align-items:center; justify-content:space-between;">';
        echo '<div>';
        echo '<strong style="font-size:14px;">🚀 AIVision SEO Update Available!</strong> ';
        echo '<span style="color:#94a3b8; font-size:13px;">New version <strong>v' . esc_html( $remote['latest'] ) . '</strong> is ready (Current: v' . esc_html( AIVISION_VERSION ) . ').</span>';
        echo '</div>';
        echo '<div style="margin-left:14px;">';
        echo '<a href="' . esc_url( $update_url ) . '" class="button button-primary" style="background:#3b82f6; border-color:#2563eb; font-weight:700; padding:4px 14px; border-radius:6px;">⚡ Update Automatically Now</a>';
        echo '</div>';
        echo '</div>';
    }

    /**
     * AJAX on-demand update check
     */
    public static function ajax_check_update() {
        check_ajax_referer( 'aivision_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( 'Permission denied.' );
        }

        delete_transient( 'aivision_remote_update_info' );
        delete_site_transient( 'update_plugins' );

        $remote = self::get_remote_version( true );
        if ( ! $remote || empty( $remote['latest'] ) ) {
            wp_send_json_error( 'Unable to connect to update server.' );
        }

        $has_update = version_compare( AIVISION_VERSION, $remote['latest'], '<' );
        $basename   = self::get_plugin_basename();
        $update_url = wp_nonce_url(
            self_admin_url( 'update.php?action=upgrade-plugin&plugin=' . urlencode( $basename ) ),
            'upgrade-plugin_' . $basename
        );

        wp_send_json_success( [
            'has_update'  => $has_update,
            'current'     => AIVISION_VERSION,
            'latest'      => $remote['latest'],
            'update_url'  => $has_update ? $update_url : '',
            'message'     => $has_update
                ? "New version v{$remote['latest']} is available!"
                : "You are running the latest version of AIVision SEO (v" . AIVISION_VERSION . ").",
        ] );
    }
}
