<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class AIVision_Sitemap {

    public static function init() {
        // Disable core sitemaps to prevent conflicts
        add_filter( 'wp_sitemaps_enabled', '__return_false' );

        add_action( 'init',             [ __CLASS__, 'add_rewrite_rules' ] );
        add_filter( 'query_vars',       [ __CLASS__, 'add_query_vars' ] );
        add_action( 'template_redirect', [ __CLASS__, 'render_sitemap' ] );
    }

    public static function add_rewrite_rules() {
        add_rewrite_rule( '^sitemap_index\.xml$', 'index.php?aivision_sitemap=1', 'top' );
        add_rewrite_rule( '^sitemap\.xml$', 'index.php?aivision_sitemap=1', 'top' );
        add_rewrite_rule( '^wp-sitemap\.xml$', 'index.php?aivision_sitemap=1', 'top' );
    }

    public static function add_query_vars( $vars ) {
        $vars[] = 'aivision_sitemap';
        return $vars;
    }

    public static function render_sitemap() {
        // Redirect core wp-sitemap.xml or sub-sitemaps to our sitemap.xml
        $request_uri = $_SERVER['REQUEST_URI'] ?? '';
        if ( preg_match( '/wp-sitemap(-[a-z0-9-]+)?\.xml$/i', $request_uri ) ) {
            wp_redirect( home_url( '/sitemap.xml' ), 301 );
            exit;
        }

        if ( get_query_var( 'aivision_sitemap' ) ) {
            // Discard any existing output buffers to prevent whitespace leakage
            while ( ob_get_level() ) {
                ob_end_clean();
            }
            $xml = self::generate_xml_string();
            header( 'Content-Type: application/xml; charset=utf-8' );
            header( 'X-Robots-Tag: noindex, follow', true );
            echo $xml;
            exit;
        }
    }

    public static function generate_xml_string() {
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

        // Homepage
        $xml .= '  <url>' . "\n";
        $xml .= '    <loc>' . esc_url( home_url( '/' ) ) . '</loc>' . "\n";
        $xml .= '    <lastmod>' . esc_html( gmdate( 'c' ) ) . '</lastmod>' . "\n";
        $xml .= '    <changefreq>daily</changefreq>' . "\n";
        $xml .= '    <priority>1.0</priority>' . "\n";
        $xml .= '  </url>' . "\n";

        $front_page_id = (int) get_option( 'page_on_front' );

        // Public posts & pages
        $query = new WP_Query( [
            'post_type'              => [ 'post', 'page' ],
            'post_status'            => 'publish',
            'posts_per_page'         => 1000,
            'orderby'                => 'modified',
            'order'                  => 'DESC',
            'no_found_rows'          => true,
            'update_post_term_cache' => false,
        ] );

        if ( $query->have_posts() ) {
            while ( $query->have_posts() ) {
                $query->the_post();
                $post_id   = get_the_ID();
                $post_type = get_post_type( $post_id );

                // Skip static front page as it is already included as the homepage root URL
                if ( $front_page_id && $post_id === $front_page_id ) {
                    continue;
                }

                $priority = ( $post_type === 'page' ) ? '0.8' : '0.6';

                // Check if post is set to noindex
                $meta = get_post_meta( $post_id, AIVISION_META_KEY, true ) ?: [];
                $robots = $meta['meta_robots'] ?? '';
                if ( str_contains( strtolower( $robots ), 'noindex' ) ) {
                    continue;
                }

                $xml .= '  <url>' . "\n";
                $xml .= '    <loc>' . esc_url( get_permalink( $post_id ) ) . '</loc>' . "\n";
                $xml .= '    <lastmod>' . esc_html( get_the_modified_date( 'c', $post_id ) ) . '</lastmod>' . "\n";
                $xml .= '    <changefreq>weekly</changefreq>' . "\n";
                $xml .= '    <priority>' . esc_html( $priority ) . '</priority>' . "\n";
                $xml .= '  </url>' . "\n";
            }
            wp_reset_postdata();
        }

        $xml .= '</urlset>';
        return $xml;
    }

    public static function write_physical_sitemap() {
        $sitemap_path = rtrim( ABSPATH, '/\\' ) . '/sitemap.xml';
        $dir = dirname( $sitemap_path );

        // Try to delete existing sitemap.xml first if it is not writable but directory is
        if ( file_exists( $sitemap_path ) && is_writable( $dir ) && ! is_writable( $sitemap_path ) ) {
            @unlink( $sitemap_path );
        }

        $xml = self::generate_xml_string();
        $written = @file_put_contents( $sitemap_path, $xml );

        if ( $written !== false ) {
            return [
                'success' => true,
                'url'     => home_url( '/sitemap.xml' )
            ];
        } else {
            return [
                'success' => false,
                'error'   => 'Root directory not writable',
                'url'     => home_url( '/sitemap.xml' )
            ];
        }
    }
}
