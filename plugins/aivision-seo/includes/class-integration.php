<?php
/**
 * AIVisibility SEO Integration & REST API Controller
 * 
 * Handles bi-directional communication with AIVisibility SEO Cloud while ensuring
 * 100% full standalone functionality when disconnected.
 *
 * @package AIVision_SEO
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class AIVisibility_Integration {

    const REST_NAMESPACE    = 'aivision-seo/v1';
    const OPTION_KEY        = 'aivision_seo_settings';
    const LEGACY_OPTION_KEY = 'aivision_brandos_settings';

    public static function init() {
        add_action( 'rest_api_init',                    [ __CLASS__, 'register_rest_routes' ] );
        
        // Primary AJAX actions
        add_action( 'wp_ajax_aivision_test_aivisibility', [ __CLASS__, 'ajax_test_aivisibility_connection' ] );
        add_action( 'wp_ajax_aivision_save_aivisibility', [ __CLASS__, 'ajax_save_aivisibility_settings' ] );
        add_action( 'wp_ajax_aivision_sync_aivisibility', [ __CLASS__, 'ajax_sync_aivisibility_telemetry' ] );

        // Backward compatibility AJAX aliases
        add_action( 'wp_ajax_aivision_test_brandos',    [ __CLASS__, 'ajax_test_aivisibility_connection' ] );
        add_action( 'wp_ajax_aivision_save_brandos',    [ __CLASS__, 'ajax_save_aivisibility_settings' ] );
        add_action( 'wp_ajax_aivision_sync_brandos',    [ __CLASS__, 'ajax_sync_aivisibility_telemetry' ] );
    }

    /**
     * Get AIVisibility SEO Integration Settings
     */
    public static function get_settings() {
        $defaults = [
            'connected'       => false,
            'api_url'         => 'https://icandothat.online',
            'api_key'         => '',
            'business_id'     => '',
            'site_token'      => '',
            'last_synced_at'  => '',
            'auto_sync'       => true,
        ];

        $settings = get_option( self::OPTION_KEY, [] );
        if ( empty( $settings ) || ( empty( $settings['api_key'] ) && empty( $settings['connected'] ) ) ) {
            $legacy = get_option( self::LEGACY_OPTION_KEY, [] );
            if ( ! empty( $legacy ) ) {
                $settings = $legacy;
            }
        }

        return wp_parse_args( $settings, $defaults );
    }

    /**
     * Check if plugin is connected to AIVisibility SEO Cloud
     */
    public static function is_connected() {
        $settings = self::get_settings();
        return ! empty( $settings['connected'] ) && ! empty( $settings['api_key'] );
    }

    /**
     * Register REST API routes for AIVisibility SEO remote control
     */
    public static function register_rest_routes() {
        // 1. Handshake & Verification Endpoint
        register_rest_route( self::REST_NAMESPACE, '/verify', [
            'methods'             => 'POST',
            'callback'            => [ __CLASS__, 'rest_verify_connection' ],
            'permission_callback' => '__return_true',
        ] );

        // 2. Status & Health Endpoint
        register_rest_route( self::REST_NAMESPACE, '/status', [
            'methods'             => 'GET',
            'callback'            => [ __CLASS__, 'rest_get_status' ],
            'permission_callback' => [ __CLASS__, 'check_rest_permission' ],
        ] );

        // 3. Remote 1-Click Fix Dispatcher
        register_rest_route( self::REST_NAMESPACE, '/apply-fix', [
            'methods'             => 'POST',
            'callback'            => [ __CLASS__, 'rest_apply_fix' ],
            'permission_callback' => [ __CLASS__, 'check_rest_permission' ],
        ] );

        // 4. Remote Copilot / Content Auto-Publisher
        register_rest_route( self::REST_NAMESPACE, '/publish-post', [
            'methods'             => 'POST',
            'callback'            => [ __CLASS__, 'rest_publish_post' ],
            'permission_callback' => [ __CLASS__, 'check_rest_permission' ],
        ] );

        // 5. Telemetry & Scoring Export
        register_rest_route( self::REST_NAMESPACE, '/telemetry', [
            'methods'             => 'GET',
            'callback'            => [ __CLASS__, 'rest_get_telemetry' ],
            'permission_callback' => [ __CLASS__, 'check_rest_permission' ],
        ] );

        // 6. Remote Instant Auto-Update Trigger
        register_rest_route( self::REST_NAMESPACE, '/remote-update', [
            'methods'             => 'POST',
            'callback'            => [ __CLASS__, 'rest_remote_update' ],
            'permission_callback' => [ __CLASS__, 'check_rest_permission' ],
        ] );
    }

    /**
     * Verify authorization header / token from incoming AIVisibility SEO requests
     */
    public static function check_rest_permission( WP_REST_Request $request ) {
        $settings = self::get_settings();
        $stored_key   = $settings['api_key'] ?? '';
        $stored_token = $settings['site_token'] ?? '';

        if ( empty( $stored_key ) ) {
            return new WP_Error( 'rest_forbidden', 'AIVisibility SEO is not connected on this site.', [ 'status' => 403 ] );
        }

        $auth_header = $request->get_header( 'authorization' ) 
                    ?: ( $request->get_header( 'x-aivisibility-api-key' ) 
                    ?: $request->get_header( 'x-brandos-api-key' ) );
        $token = '';

        if ( $auth_header ) {
            if ( str_starts_with( $auth_header, 'Bearer ' ) ) {
                $token = substr( $auth_header, 7 );
            } else {
                $token = $auth_header;
            }
        }

        if ( ! $token ) {
            $token = $request->get_param( 'api_key' );
        }

        if ( ! hash_equals( $stored_key, $token ) && ( empty( $stored_token ) || ! hash_equals( $stored_token, $token ) ) ) {
            return new WP_Error( 'rest_unauthorized', 'Invalid AIVisibility SEO authentication token.', [ 'status' => 401 ] );
        }

        return true;
    }

    /**
     * REST: Verify Connection Handshake
     */
    public static function rest_verify_connection( WP_REST_Request $request ) {
        $api_key     = sanitize_text_field( $request->get_param( 'api_key' ) );
        $business_id = sanitize_text_field( $request->get_param( 'business_id' ) );
        $api_url     = esc_url_raw( $request->get_param( 'api_url' ) ?: 'https://icandothat.online' );

        if ( empty( $api_key ) ) {
            return new WP_REST_Response( [
                'success' => false,
                'message' => 'Missing required api_key parameter.',
            ], 400 );
        }

        $site_token = wp_generate_password( 32, false );

        $settings = [
            'connected'      => true,
            'api_url'        => $api_url,
            'api_key'        => $api_key,
            'business_id'    => $business_id,
            'site_token'     => $site_token,
            'last_synced_at' => current_time( 'mysql' ),
            'auto_sync'      => true,
        ];

        update_option( self::OPTION_KEY, $settings );
        update_option( self::LEGACY_OPTION_KEY, $settings );

        return new WP_REST_Response( [
            'success'        => true,
            'message'        => 'Handshake successful! AIVision SEO connected to AIVisibility SEO.',
            'plugin_version' => AIVISION_VERSION,
            'site_name'      => get_bloginfo( 'name' ),
            'site_url'       => home_url(),
            'site_token'     => $site_token,
            'features'       => [
                'llms_txt'        => true,
                'robots_txt'      => true,
                'schemas'         => true,
                'remote_fixes'    => true,
                'auto_publishing' => true,
            ],
        ], 200 );
    }

    /**
     * REST: Status & Health
     */
    public static function rest_get_status( WP_REST_Request $request ) {
        global $wpdb;

        $posts_with_meta = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(DISTINCT post_id) FROM {$wpdb->postmeta} WHERE meta_key = %s",
                AIVISION_META_KEY
            )
        );

        $post_counts = wp_count_posts( 'post' );
        $page_counts = wp_count_posts( 'page' );
        $total_posts = ( (int) ( $post_counts->publish ?? 0 ) ) + ( (int) ( $page_counts->publish ?? 0 ) );

        $settings = get_option( 'aivision_settings', [] );
        $aivisibility_settings = self::get_settings();

        return new WP_REST_Response( [
            'success'        => true,
            'site_name'      => get_bloginfo( 'name' ),
            'site_url'       => home_url(),
            'plugin_version' => AIVISION_VERSION,
            'mode'           => self::is_connected() ? 'CONNECTED' : 'STANDALONE',
            'business_id'    => $aivisibility_settings['business_id'] ?? '',
            'stats'          => [
                'total_posts'     => $total_posts,
                'optimized_posts' => (int) $posts_with_meta,
                'coverage_pct'    => $total_posts > 0 ? round( ( $posts_with_meta / $total_posts ) * 100, 1 ) : 0,
            ],
            'feeds'          => [
                'sitemap_url'     => home_url( '/sitemap.xml' ),
                'llms_txt_url'    => home_url( '/llms.txt' ),
                'llms_full_url'   => home_url( '/llms-full.txt' ),
                'robots_txt_url'  => home_url( '/robots.txt' ),
            ],
            'ai_crawlers'    => [
                'enabled'      => ! empty( $settings['ai_crawlers_enabled'] ),
                'allowed_bots' => $settings['allowed_bots'] ?? AIVision_Robots::OPTIMAL_ALLOWED_BOTS,
            ],
            'site_type'      => $settings['site_type'] ?? 'general',
            'site_ai_bio'    => $settings['site_ai_bio'] ?? '',
            'last_synced_at' => $aivisibility_settings['last_synced_at'] ?? '',
        ], 200 );
    }

    /**
     * REST: Apply 1-Click Remote Fix from AIVisibility SEO
     */
    public static function rest_apply_fix( WP_REST_Request $request ) {
        $fix_type = sanitize_text_field( $request->get_param( 'fix_type' ) );
        $payload  = $request->get_param( 'payload' );

        if ( empty( $fix_type ) ) {
            return new WP_REST_Response( [ 'success' => false, 'message' => 'Missing fix_type parameter.' ], 400 );
        }

        switch ( $fix_type ) {
            case 'enable_robots_txt':
                $settings = get_option( 'aivision_settings', [] );
                $settings['ai_crawlers_enabled'] = true;
                $settings['allowed_bots'] = array_unique( array_merge(
                    $settings['allowed_bots'] ?? [],
                    [ 'GPTBot', 'OAI-SearchBot', 'Google-Extended' ]
                ) );
                update_option( 'aivision_settings', $settings );
                return new WP_REST_Response( [ 'success' => true, 'message' => 'Robots.txt AI crawlers enabled and allowed.' ], 200 );

            case 'enable_llms_txt':
                $settings = get_option( 'aivision_settings', [] );
                $settings['llms_txt_enabled'] = true;
                update_option( 'aivision_settings', $settings );
                return new WP_REST_Response( [ 'success' => true, 'message' => '/llms.txt public feed enabled.' ], 200 );

            case 'set_site_bio':
                $bio = sanitize_textarea_field( $payload['site_ai_bio'] ?? '' );
                $site_type = sanitize_text_field( $payload['site_type'] ?? 'general' );
                $settings = get_option( 'aivision_settings', [] );
                if ( $bio ) $settings['site_ai_bio'] = $bio;
                if ( $site_type ) $settings['site_type'] = $site_type;
                update_option( 'aivision_settings', $settings );
                return new WP_REST_Response( [ 'success' => true, 'message' => 'Site AI Bio and Industry vertical updated.' ], 200 );

            case 'set_schema':
                $schema_type = sanitize_text_field( $payload['schema_type'] ?? 'Organization' );
                $schema_data = is_array( $payload['schema_data'] ?? null ) ? $payload['schema_data'] : [];
                $settings = get_option( 'aivision_settings', [] );
                $settings['global_schema_type'] = $schema_type;
                $settings['global_schema_data'] = $schema_data;
                update_option( 'aivision_settings', $settings );
                return new WP_REST_Response( [ 'success' => true, 'message' => "Global JSON-LD {$schema_type} Schema saved." ], 200 );

            case 'optimize_post':
                $post_id = (int) ( $payload['post_id'] ?? 0 );
                if ( ! $post_id || ! get_post( $post_id ) ) {
                    return new WP_REST_Response( [ 'success' => false, 'message' => 'Post not found.' ], 404 );
                }
                $meta = get_post_meta( $post_id, AIVISION_META_KEY, true ) ?: [];
                if ( ! empty( $payload['seo_title'] ) ) $meta['title'] = sanitize_text_field( $payload['seo_title'] );
                if ( ! empty( $payload['seo_description'] ) ) $meta['description'] = sanitize_textarea_field( $payload['seo_description'] );
                if ( ! empty( $payload['target_keyword'] ) ) $meta['target_keyword'] = sanitize_text_field( $payload['target_keyword'] );
                if ( ! empty( $payload['faq_items'] ) && is_array( $payload['faq_items'] ) ) $meta['faqs'] = $payload['faq_items'];
                if ( ! empty( $payload['direct_answer'] ) ) $meta['direct_answer'] = sanitize_textarea_field( $payload['direct_answer'] );
                update_post_meta( $post_id, AIVISION_META_KEY, $meta );
                return new WP_REST_Response( [ 'success' => true, 'message' => "Post #{$post_id} optimized." ], 200 );

            case 'update_plugin':
                return self::rest_remote_update( $request );

            default:
                return new WP_REST_Response( [ 'success' => false, 'message' => "Unknown fix_type: {$fix_type}" ], 400 );
        }
    }

    /**
     * REST: Execute Remote Real-Time Plugin Auto-Update
     */
    public static function rest_remote_update( WP_REST_Request $request ) {
        $download_url = esc_url_raw( $request->get_param( 'download_url' ) ?: 'https://icandothat.online/api/wordpress/plugin-download' );

        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/misc.php';
        require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
        require_once ABSPATH . 'wp-admin/includes/plugin-install.php';
        require_once ABSPATH . 'wp-admin/includes/plugin.php';

        $skin = new WP_Ajax_Upgrader_Skin();
        $upgrader = new Plugin_Upgrader( $skin );

        $installed = $upgrader->install( $download_url, [ 'overwrite_package' => true ] );

        if ( is_wp_error( $installed ) ) {
            return new WP_REST_Response( [
                'success' => false,
                'error'   => $installed->get_error_message(),
            ], 500 );
        }

        $plugin_file = 'aivision-seo/aivision-seo.php';
        if ( ! is_plugin_active( $plugin_file ) ) {
            activate_plugin( $plugin_file );
        }

        delete_transient( 'aivision_remote_update_info' );
        delete_site_transient( 'update_plugins' );
        if ( function_exists( 'wp_cache_flush' ) ) wp_cache_flush();
        if ( function_exists( 'opcache_reset' ) ) @opcache_reset();

        $plugin_data = function_exists( 'get_plugin_data' ) 
            ? get_plugin_data( WP_PLUGIN_DIR . '/' . $plugin_file, false, false )
            : [];
        $new_version = $plugin_data['Version'] ?? ( defined( 'AIVISION_VERSION' ) ? AIVISION_VERSION : 'unknown' );

        return new WP_REST_Response( [
            'success'          => true,
            'message'          => 'AIVision SEO plugin automatically updated and activated successfully!',
            'previous_version' => defined( 'AIVISION_VERSION' ) ? AIVISION_VERSION : 'unknown',
            'current_version'  => $new_version,
            'updated_at'       => current_time( 'mysql' ),
        ], 200 );
    }

    /**
     * REST: Remote Post Publisher (Copilot / Autopilot)
     */
    public static function rest_publish_post( WP_REST_Request $request ) {
        $title    = sanitize_text_field( $request->get_param( 'title' ) );
        $content  = wp_kses_post( $request->get_param( 'content' ) );
        $category = sanitize_text_field( $request->get_param( 'category' ) );
        $status   = sanitize_text_field( $request->get_param( 'status' ) ?: 'draft' );
        $meta     = $request->get_param( 'seo_meta' ) ?: [];

        if ( empty( $title ) || empty( $content ) ) {
            return new WP_REST_Response( [ 'success' => false, 'message' => 'Title and content are required.' ], 400 );
        }

        if ( ! in_array( $status, [ 'draft', 'publish', 'pending' ], true ) ) {
            $status = 'draft';
        }

        $post_data = [
            'post_title'   => $title,
            'post_content' => $content,
            'post_status'  => $status,
            'post_type'    => 'post',
            'post_author'  => 1,
        ];

        $post_id = wp_insert_post( $post_data, true );

        if ( is_wp_error( $post_id ) ) {
            return new WP_REST_Response( [ 'success' => false, 'message' => $post_id->get_error_message() ], 500 );
        }

        if ( ! empty( $category ) ) {
            $cat_id = wp_create_category( $category );
            if ( $cat_id ) wp_set_post_categories( $post_id, [ $cat_id ] );
        }

        if ( ! empty( $meta ) && is_array( $meta ) ) {
            $seo_data = [
                'title'          => sanitize_text_field( $meta['title'] ?? $title ),
                'description'    => sanitize_textarea_field( $meta['description'] ?? '' ),
                'target_keyword' => sanitize_text_field( $meta['target_keyword'] ?? '' ),
                'direct_answer'  => sanitize_textarea_field( $meta['direct_answer'] ?? '' ),
                'faqs'           => is_array( $meta['faqs'] ?? null ) ? $meta['faqs'] : [],
            ];
            update_post_meta( $post_id, AIVISION_META_KEY, $seo_data );
        }

        return new WP_REST_Response( [
            'success'   => true,
            'post_id'   => $post_id,
            'status'    => $status,
            'edit_url'  => admin_url( "post.php?post={$post_id}&action=edit" ),
            'view_url'  => get_permalink( $post_id ),
            'message'   => "Article successfully created as {$status}.",
        ], 201 );
    }

    /**
     * REST: Telemetry & Scoring Export
     */
    public static function rest_get_telemetry( WP_REST_Request $request ) {
        global $wpdb;

        $meta_rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT post_id, meta_value FROM {$wpdb->postmeta} WHERE meta_key = %s LIMIT 100",
                AIVISION_META_KEY
            )
        );

        $posts = [];
        foreach ( $meta_rows as $row ) {
            $post = get_post( $row->post_id );
            if ( ! $post || $post->post_status !== 'publish' ) continue;

            $meta = maybe_unserialize( $row->meta_value ) ?: [];
            $scores = AIVision_Analyzer::analyze( $post->post_content, $post->post_title, $meta );

            $posts[] = [
                'id'           => $post->ID,
                'title'        => $post->post_title,
                'url'          => get_permalink( $post->ID ),
                'overall_score'=> $scores['overall'],
                'seo_score'    => $scores['seo']['score'],
                'aeo_score'    => $scores['aeo']['score'],
                'geo_score'    => $scores['geo']['score'],
                'direct_answer'=> ! empty( $meta['direct_answer'] ),
                'faq_count'    => count( $meta['faqs'] ?? [] ),
                'modified_at'  => $post->post_modified,
            ];
        }

        $settings = get_option( 'aivision_settings', [] );

        return new WP_REST_Response( [
            'success'   => true,
            'telemetry' => [
                'posts'           => $posts,
                'total_analyzed'  => count( $posts ),
                'robots_enabled'  => ! empty( $settings['ai_crawlers_enabled'] ),
                'llms_txt_enabled'=> ! empty( $settings['llms_txt_enabled'] ),
                'site_type'       => $settings['site_type'] ?? 'general',
                'schema_type'     => $settings['global_schema_type'] ?? 'Organization',
                'exported_at'     => current_time( 'mysql' ),
            ],
        ], 200 );
    }

    /**
     * AJAX: Test AIVisibility SEO Cloud Connection from WP Admin
     */
    public static function ajax_test_aivisibility_connection() {
        check_ajax_referer( 'aivision_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'Unauthorized' );

        $raw_url = trim( $_POST['api_url'] ?? 'https://icandothat.online' );
        $api_key = sanitize_text_field( $_POST['api_key'] ?? '' );

        if ( empty( $api_key ) ) {
            wp_send_json_error( 'Please enter a valid AIVisibility SEO API Key.' );
        }

        if ( ! preg_match( '#^https?://#i', $raw_url ) ) {
            $raw_url = 'https://' . $raw_url;
        }

        $api_url = esc_url_raw( $raw_url );
        $base_url = rtrim( $api_url, '/' );

        $endpoints = [
            $base_url . '/wordpress/verify',
            $base_url . '/api/wordpress/verify',
        ];

        $response = null;
        $last_error = '';

        foreach ( $endpoints as $endpoint ) {
            $response = wp_remote_post( $endpoint, [
                'timeout'   => 15,
                'sslverify' => false,
                'headers'   => [
                    'Content-Type'  => 'application/json',
                    'Authorization' => 'Bearer ' . $api_key,
                ],
                'body' => wp_json_encode( [
                    'site_url'       => home_url(),
                    'site_name'      => get_bloginfo( 'name' ),
                    'plugin_version' => AIVISION_VERSION,
                ] ),
            ] );

            if ( ! is_wp_error( $response ) ) {
                $code = wp_remote_retrieve_response_code( $response );
                if ( $code >= 200 && $code < 300 ) {
                    break;
                }
            } else {
                $last_error = $response->get_error_message();
            }
        }

        if ( is_wp_error( $response ) ) {
            wp_send_json_error( 'Could not reach AIVisibility SEO at ' . esc_url( $api_url ) . ' (Tip: Use https://icandothat.online): ' . $last_error );
        }

        $code = wp_remote_retrieve_response_code( $response );
        $body = json_decode( wp_remote_retrieve_body( $response ), true );

        if ( $code >= 200 && $code < 300 && ! empty( $body['success'] ) ) {
            $settings = self::get_settings();
            $settings['connected']      = true;
            $settings['api_url']        = $api_url;
            $settings['api_key']        = $api_key;
            $settings['business_id']    = $body['business_id'] ?? '';
            $settings['last_synced_at'] = current_time( 'mysql' );
            update_option( self::OPTION_KEY, $settings );
            update_option( self::LEGACY_OPTION_KEY, $settings );

            wp_send_json_success( [
                'message'     => 'Connected to AIVisibility SEO successfully!',
                'business'    => $body['business_name'] ?? 'AIVisibility SEO Business',
                'business_id' => $body['business_id'] ?? '',
            ] );
        } else {
            $msg = $body['message'] ?? 'AIVisibility SEO rejected the connection. Please verify your API Key.';
            wp_send_json_error( $msg );
        }
    }

    /**
     * AJAX: Save AIVisibility SEO Settings or Disconnect
     */
    public static function ajax_save_aivisibility_settings() {
        check_ajax_referer( 'aivision_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'Unauthorized' );

        $disconnect = ! empty( $_POST['disconnect'] );
        if ( $disconnect ) {
            $cleared = [
                'connected'      => false,
                'api_url'        => 'https://icandothat.online',
                'api_key'        => '',
                'business_id'    => '',
                'site_token'     => '',
                'last_synced_at' => '',
            ];
            update_option( self::OPTION_KEY, $cleared );
            update_option( self::LEGACY_OPTION_KEY, $cleared );
            wp_send_json_success( [ 'message' => 'Switched back to Standalone Mode.' ] );
        }

        $api_url = esc_url_raw( $_POST['api_url'] ?? 'https://icandothat.online' );
        $api_key = sanitize_text_field( $_POST['api_key'] ?? '' );

        $settings = self::get_settings();
        $settings['api_url']   = $api_url;
        $settings['api_key']   = $api_key;
        $settings['connected'] = ! empty( $api_key );
        update_option( self::OPTION_KEY, $settings );
        update_option( self::LEGACY_OPTION_KEY, $settings );

        wp_send_json_success( [ 'message' => 'AIVisibility SEO settings saved.' ] );
    }

    /**
     * AJAX: Manual Sync Telemetry with AIVisibility SEO Cloud
     */
    public static function ajax_sync_aivisibility_telemetry() {
        check_ajax_referer( 'aivision_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'Unauthorized' );

        $settings = self::get_settings();
        if ( empty( $settings['connected'] ) || empty( $settings['api_key'] ) ) {
            wp_send_json_error( 'Plugin is operating in Standalone Mode. Connect to AIVisibility SEO first.' );
        }

        $settings['last_synced_at'] = current_time( 'mysql' );
        update_option( self::OPTION_KEY, $settings );
        update_option( self::LEGACY_OPTION_KEY, $settings );

        wp_send_json_success( [
            'message'   => 'Telemetry successfully synchronized with AIVisibility SEO!',
            'synced_at' => current_time( 'mysql' ),
        ] );
    }
}

// Backward-compatibility alias
if ( ! class_exists( 'AIVision_BrandOS_Integration' ) ) {
    class_alias( 'AIVisibility_Integration', 'AIVision_BrandOS_Integration' );
}
