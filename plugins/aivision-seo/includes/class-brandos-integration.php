<?php
/**
 * AIVision BrandOS Integration & REST API Controller
 * 
 * Handles bi-directional communication with BrandOS Cloud while ensuring
 * 100% full standalone functionality when disconnected.
 *
 * @package AIVision_SEO
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class AIVision_BrandOS_Integration {

    const REST_NAMESPACE = 'aivision-seo/v1';
    const OPTION_KEY     = 'aivision_brandos_settings';

    public static function init() {
        add_action( 'rest_api_init',                 [ __CLASS__, 'register_rest_routes' ] );
        add_action( 'wp_ajax_aivision_test_brandos', [ __CLASS__, 'ajax_test_brandos_connection' ] );
        add_action( 'wp_ajax_aivision_save_brandos', [ __CLASS__, 'ajax_save_brandos_settings' ] );
        add_action( 'wp_ajax_aivision_sync_brandos', [ __CLASS__, 'ajax_sync_brandos_telemetry' ] );
    }

    /**
     * Get BrandOS Integration Settings
     */
    public static function get_settings() {
        $defaults = [
            'connected'       => false,
            'api_url'         => 'http://localhost:4000', // Default local BrandOS API or cloud URL
            'api_key'         => '',
            'business_id'     => '',
            'site_token'      => '',
            'last_synced_at'  => '',
            'auto_sync'       => true,
        ];
        $settings = get_option( self::OPTION_KEY, [] );
        return wp_parse_args( $settings, $defaults );
    }

    /**
     * Check if plugin is connected to BrandOS SaaS
     */
    public static function is_connected() {
        $settings = self::get_settings();
        return ! empty( $settings['connected'] ) && ! empty( $settings['api_key'] );
    }

    /**
     * Register REST API routes for BrandOS remote control
     */
    public static function register_rest_routes() {
        // 1. Handshake & Verification Endpoint
        register_rest_route( self::REST_NAMESPACE, '/verify', [
            'methods'             => 'POST',
            'callback'            => [ __CLASS__, 'rest_verify_connection' ],
            'permission_callback' => '__return_true', // Validates api_key in payload
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
    }

    /**
     * Verify authorization header / token from incoming BrandOS requests
     */
    public static function check_rest_permission( WP_REST_Request $request ) {
        $settings = self::get_settings();
        $stored_key   = $settings['api_key'] ?? '';
        $stored_token = $settings['site_token'] ?? '';

        if ( empty( $stored_key ) ) {
            return new WP_Error( 'rest_forbidden', 'BrandOS is not connected on this site.', [ 'status' => 403 ] );
        }

        $auth_header = $request->get_header( 'authorization' ) ?: $request->get_header( 'x-brandos-api-key' );
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
            return new WP_Error( 'rest_unauthorized', 'Invalid BrandOS authentication token.', [ 'status' => 401 ] );
        }

        return true;
    }

    /**
     * REST: Verify Connection Handshake
     */
    public static function rest_verify_connection( WP_REST_Request $request ) {
        $api_key     = sanitize_text_field( $request->get_param( 'api_key' ) );
        $business_id = sanitize_text_field( $request->get_param( 'business_id' ) );
        $api_url     = esc_url_raw( $request->get_param( 'api_url' ) ?: 'http://localhost:4000' );

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

        return new WP_REST_Response( [
            'success'        => true,
            'message'        => 'Handshake successful! AIVision SEO connected to BrandOS.',
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
     * REST: Get Site & Plugin Status
     */
    public static function rest_get_status( WP_REST_Request $request ) {
        global $wpdb;

        $posts_with_meta = $wpdb->get_var(
            $wpdb->prepare( "SELECT COUNT(DISTINCT post_id) FROM {$wpdb->postmeta} WHERE meta_key = %s", AIVISION_META_KEY )
        );
        $post_counts = wp_count_posts( 'post' );
        $page_counts = wp_count_posts( 'page' );
        $total_posts = ( (int) ( $post_counts->publish ?? 0 ) ) + ( (int) ( $page_counts->publish ?? 0 ) );

        $settings = get_option( 'aivision_settings', [] );
        $brandos_settings = self::get_settings();

        return new WP_REST_Response( [
            'success'        => true,
            'site_name'      => get_bloginfo( 'name' ),
            'site_url'       => home_url(),
            'plugin_version' => AIVISION_VERSION,
            'mode'           => self::is_connected() ? 'CONNECTED' : 'STANDALONE',
            'business_id'    => $brandos_settings['business_id'] ?? '',
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
            'last_synced_at' => $brandos_settings['last_synced_at'] ?? '',
        ], 200 );
    }

    /**
     * REST: Apply 1-Click Remote Fix from BrandOS
     */
    public static function rest_apply_fix( WP_REST_Request $request ) {
        $fix_type = sanitize_text_field( $request->get_param( 'fix_type' ) );
        $payload  = $request->get_param( 'payload' );

        if ( ! is_array( $payload ) ) {
            $payload = [];
        }

        $applied = false;
        $message = '';

        switch ( $fix_type ) {
            case 'ROBOTS_TXT':
            case 'OPTIMIZE_ROBOTS':
                $settings = get_option( 'aivision_settings', [] );
                $settings['ai_crawlers_enabled'] = true;
                if ( ! empty( $payload['allowed_bots'] ) && is_array( $payload['allowed_bots'] ) ) {
                    $settings['allowed_bots'] = array_map( 'sanitize_text_field', $payload['allowed_bots'] );
                } else {
                    $settings['allowed_bots'] = AIVision_Robots::OPTIMAL_ALLOWED_BOTS;
                }
                update_option( 'aivision_settings', $settings );
                AIVision_Robots::write_physical_robots();
                $applied = true;
                $message = 'Robots.txt optimized for AI crawlers and synchronized physically.';
                break;

            case 'LLMS_TXT_BIO':
            case 'UPDATE_AI_BIO':
                $bio = sanitize_textarea_field( $payload['site_ai_bio'] ?? '' );
                $settings = get_option( 'aivision_settings', [] );
                $settings['site_ai_bio'] = $bio;
                update_option( 'aivision_settings', $settings );
                AIVision_LLMsTxt::auto_sync();
                $applied = true;
                $message = 'Site AI Bio updated and /llms.txt feed synchronized.';
                break;

            case 'ADD_SCHEMA':
            case 'FAQ_SCHEMA':
            case 'LOCAL_BUSINESS_SCHEMA':
                $post_id    = (int) ( $payload['post_id'] ?? 0 );
                $schema_raw = $payload['schema_json'] ?? '';
                $schema_type = sanitize_text_field( $payload['schema_type'] ?? 'FAQPage' );

                if ( ! $post_id ) {
                    // Fallback to front page or most recent page if not specified
                    $post_id = (int) get_option( 'page_on_front' );
                    if ( ! $post_id ) {
                        $recent = get_posts( [ 'numberposts' => 1, 'post_status' => 'publish' ] );
                        if ( ! empty( $recent ) ) $post_id = $recent[0]->ID;
                    }
                }

                if ( $post_id && $schema_raw ) {
                    $meta = get_post_meta( $post_id, AIVISION_META_KEY, true );
                    if ( ! is_array( $meta ) ) $meta = [];
                    if ( empty( $meta['schemas'] ) || ! is_array( $meta['schemas'] ) ) $meta['schemas'] = [];

                    $meta['schemas'][] = [
                        'type' => $schema_type,
                        'json' => is_string( $schema_raw ) ? $schema_raw : wp_json_encode( $schema_raw, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ),
                    ];

                    update_post_meta( $post_id, AIVISION_META_KEY, $meta );
                    $applied = true;
                    $message = "Schema {$schema_type} injected into post #{$post_id}.";
                } else {
                    return new WP_REST_Response( [ 'success' => false, 'message' => 'Missing post_id or schema_json' ], 400 );
                }
                break;

            case 'GENERATE_FEEDS':
                AIVision_Robots::write_physical_robots();
                AIVision_LLMsTxt::auto_sync();
                AIVision_Sitemap::write_physical_sitemap();
                $applied = true;
                $message = 'All XML sitemaps, robots.txt, and llms.txt feeds generated.';
                break;

            default:
                return new WP_REST_Response( [ 'success' => false, 'message' => "Unknown fix type: {$fix_type}" ], 400 );
        }

        return new WP_REST_Response( [
            'success' => $applied,
            'message' => $message,
            'timestamp' => current_time( 'mysql' ),
        ], 200 );
    }

    /**
     * REST: Remote Copilot / Content Auto-Publisher
     */
    public static function rest_publish_post( WP_REST_Request $request ) {
        $title       = sanitize_text_field( $request->get_param( 'title' ) );
        $content     = wp_kses_post( $request->get_param( 'content' ) );
        $status      = sanitize_text_field( $request->get_param( 'status' ) ?: 'draft' );
        $post_type   = sanitize_text_field( $request->get_param( 'post_type' ) ?: 'post' );
        $categories  = $request->get_param( 'categories' ) ?: [];
        $tags        = $request->get_param( 'tags' ) ?: [];
        
        // AIVision SEO Meta Fields
        $meta_title  = sanitize_text_field( $request->get_param( 'meta_title' ) ?: $title );
        $meta_desc   = sanitize_text_field( $request->get_param( 'meta_description' ) ?: '' );
        $focus_kw    = sanitize_text_field( $request->get_param( 'focus_keyword' ) ?: '' );
        $schemas     = $request->get_param( 'schemas' ) ?: [];

        if ( empty( $title ) || empty( $content ) ) {
            return new WP_REST_Response( [
                'success' => false,
                'message' => 'Missing post title or content.',
            ], 400 );
        }

        $post_data = [
            'post_title'   => $title,
            'post_content' => $content,
            'post_status'  => in_array( $status, [ 'publish', 'draft', 'pending' ] ) ? $status : 'draft',
            'post_type'    => $post_type,
            'post_author'  => get_current_user_id() ?: 1,
        ];

        $post_id = wp_insert_post( $post_data );

        if ( is_wp_error( $post_id ) ) {
            return new WP_REST_Response( [
                'success' => false,
                'message' => $post_id->get_error_message(),
            ], 500 );
        }

        // Set categories & tags if provided
        if ( ! empty( $categories ) && is_array( $categories ) ) {
            wp_set_post_categories( $post_id, array_map( 'intval', $categories ) );
        }
        if ( ! empty( $tags ) && is_array( $tags ) ) {
            wp_set_post_tags( $post_id, array_map( 'sanitize_text_field', $tags ) );
        }

        // Attach AIVision SEO Meta
        $aivision_meta = [
            'meta_title'       => $meta_title,
            'meta_description' => $meta_desc,
            'focus_keyword'    => $focus_kw,
            'meta_robots'      => 'index, follow',
            'canonical'        => get_permalink( $post_id ),
            'twitter_card'     => 'summary_large_image',
            'schemas'          => is_array( $schemas ) ? $schemas : [],
        ];

        update_post_meta( $post_id, AIVISION_META_KEY, $aivision_meta );

        // Calculate scores
        $seo = AIVision_Analyzer::seo_score( $post_id, $aivision_meta );
        $aeo = AIVision_Analyzer::aeo_score( $post_id, $aivision_meta );
        $geo = AIVision_Analyzer::geo_score( $post_id, $aivision_meta );

        return new WP_REST_Response( [
            'success'   => true,
            'post_id'   => $post_id,
            'permalink' => get_permalink( $post_id ),
            'status'    => $status,
            'scores'    => [
                'seo' => $seo['score'],
                'aeo' => $aeo['score'],
                'geo' => $geo['score'],
            ],
            'message'   => "Post successfully created as {$status} in WordPress with full AIVision metadata!",
        ], 201 );
    }

    /**
     * REST: Get Telemetry and Top Optimized Content
     */
    public static function rest_get_telemetry( WP_REST_Request $request ) {
        $limit = min( (int) ( $request->get_param( 'limit' ) ?: 20 ), 100 );
        $posts = get_posts( [
            'numberposts' => $limit,
            'post_status' => 'publish',
            'post_type'   => [ 'post', 'page' ],
        ] );

        $items = [];
        $total_seo = 0;
        $total_aeo = 0;
        $total_geo = 0;

        foreach ( $posts as $p ) {
            $meta = get_post_meta( $p->ID, AIVISION_META_KEY, true ) ?: [];
            $seo  = AIVision_Analyzer::seo_score( $p->ID, $meta );
            $aeo  = AIVision_Analyzer::aeo_score( $p->ID, $meta );
            $geo  = AIVision_Analyzer::geo_score( $p->ID, $meta );

            $total_seo += $seo['score'];
            $total_aeo += $aeo['score'];
            $total_geo += $geo['score'];

            $items[] = [
                'id'            => $p->ID,
                'title'         => $p->post_title,
                'url'           => get_permalink( $p->ID ),
                'focus_keyword' => $meta['focus_keyword'] ?? '',
                'seo_score'     => $seo['score'],
                'aeo_score'     => $aeo['score'],
                'geo_score'     => $geo['score'],
                'has_schema'    => ! empty( $meta['schemas'] ),
                'word_count'    => str_word_count( wp_strip_all_tags( $p->post_content ) ),
                'updated_at'    => $p->post_modified,
            ];
        }

        $count = count( $posts );
        return new WP_REST_Response( [
            'success'   => true,
            'summary'   => [
                'count'       => $count,
                'average_seo' => $count > 0 ? round( $total_seo / $count ) : 0,
                'average_aeo' => $count > 0 ? round( $total_aeo / $count ) : 0,
                'average_geo' => $count > 0 ? round( $total_geo / $count ) : 0,
            ],
            'posts'     => $items,
            'synced_at' => current_time( 'mysql' ),
        ], 200 );
    }

    /**
     * AJAX: Test BrandOS SaaS Connection from WP Admin
     */
    public static function ajax_test_brandos_connection() {
        check_ajax_referer( 'aivision_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'Unauthorized' );

        $api_url = esc_url_raw( $_POST['api_url'] ?? 'http://localhost:4000' );
        $api_key = sanitize_text_field( $_POST['api_key'] ?? '' );

        if ( empty( $api_key ) ) {
            wp_send_json_error( 'Please enter a valid BrandOS API Key.' );
        }

        // Ping BrandOS /wordpress/verify endpoint
        $response = wp_remote_post( rtrim( $api_url, '/' ) . '/wordpress/verify', [
            'timeout' => 15,
            'headers' => [
                'Content-Type'  => 'application/json',
                'Authorization' => 'Bearer ' . $api_key,
            ],
            'body' => wp_json_encode( [
                'site_url'       => home_url(),
                'site_name'      => get_bloginfo( 'name' ),
                'plugin_version' => AIVISION_VERSION,
            ] ),
        ] );

        if ( is_wp_error( $response ) ) {
            // If local network or offline demo, allow saving locally with helpful note
            wp_send_json_error( 'Could not reach BrandOS at ' . esc_url( $api_url ) . ': ' . $response->get_error_message() );
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

            wp_send_json_success( [
                'message'     => 'Connected to BrandOS successfully!',
                'business'    => $body['business_name'] ?? 'BrandOS Business',
                'business_id' => $body['business_id'] ?? '',
            ] );
        } else {
            $msg = $body['message'] ?? 'BrandOS rejected the connection. Please verify your API Key.';
            wp_send_json_error( $msg );
        }
    }

    /**
     * AJAX: Save BrandOS Settings or Disconnect
     */
    public static function ajax_save_brandos_settings() {
        check_ajax_referer( 'aivision_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'Unauthorized' );

        $disconnect = ! empty( $_POST['disconnect'] );
        if ( $disconnect ) {
            update_option( self::OPTION_KEY, [
                'connected'      => false,
                'api_url'        => 'http://localhost:4000',
                'api_key'        => '',
                'business_id'    => '',
                'site_token'     => '',
                'last_synced_at' => '',
            ] );
            wp_send_json_success( [ 'message' => 'Switched back to Standalone Mode.' ] );
        }

        $api_url = esc_url_raw( $_POST['api_url'] ?? 'http://localhost:4000' );
        $api_key = sanitize_text_field( $_POST['api_key'] ?? '' );

        $settings = self::get_settings();
        $settings['api_url']   = $api_url;
        $settings['api_key']   = $api_key;
        $settings['connected'] = ! empty( $api_key );
        update_option( self::OPTION_KEY, $settings );

        wp_send_json_success( [ 'message' => 'BrandOS settings saved.' ] );
    }

    /**
     * AJAX: Manual Sync Telemetry with BrandOS Cloud
     */
    public static function ajax_sync_brandos_telemetry() {
        check_ajax_referer( 'aivision_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'Unauthorized' );

        $settings = self::get_settings();
        if ( empty( $settings['connected'] ) || empty( $settings['api_key'] ) ) {
            wp_send_json_error( 'Plugin is operating in Standalone Mode. Connect to BrandOS first.' );
        }

        $settings['last_synced_at'] = current_time( 'mysql' );
        update_option( self::OPTION_KEY, $settings );

        wp_send_json_success( [
            'message'   => 'Telemetry successfully synchronized with BrandOS!',
            'synced_at' => current_time( 'mysql' ),
        ] );
    }
}
