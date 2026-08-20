<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class AIVision_LLMsTxt {

    public static function init() {
        add_action( 'init',              [ __CLASS__, 'add_rewrite_rules' ] );
        add_filter( 'query_vars',        [ __CLASS__, 'add_query_vars' ] );
        add_action( 'template_redirect', [ __CLASS__, 'render_endpoints' ] );

        // Automatic background sync on post changes
        add_action( 'save_post',              [ __CLASS__, 'auto_sync' ], 20 );
        add_action( 'transition_post_status', [ __CLASS__, 'auto_sync_status' ], 20, 3 );
        add_action( 'deleted_post',           [ __CLASS__, 'auto_sync' ], 20 );
    }

    public static function add_rewrite_rules() {
        add_rewrite_rule( '^llms\.txt$',      'index.php?aivision_llmstxt=1',      'top' );
        add_rewrite_rule( '^llms-full\.txt$', 'index.php?aivision_llmstxt_full=1', 'top' );
    }

    public static function add_query_vars( $vars ) {
        $vars[] = 'aivision_llmstxt';
        $vars[] = 'aivision_llmstxt_full';
        return $vars;
    }

    /**
     * Standard Curated /llms.txt Specification (llmstxt.org)
     */
    public static function generate_markdown() {
        $settings   = get_option( 'aivision_settings', [] );
        $site_title = get_bloginfo( 'name' );
        $site_desc  = get_bloginfo( 'description' );
        $ai_bio     = ! empty( $settings['site_ai_bio'] ) ? trim( $settings['site_ai_bio'] ) : '';

        $md = "# {$site_title}\n\n";

        // Blockquote summary (Site Bio / Description)
        if ( $ai_bio ) {
            $md .= "> " . str_replace( "\n", "\n> ", $ai_bio ) . "\n\n";
        } elseif ( $site_desc ) {
            $md .= "> {$site_desc}\n\n";
        }

        // Query published pages and posts
        $query = new WP_Query( [
            'post_type'              => [ 'page', 'post' ],
            'post_status'            => 'publish',
            'posts_per_page'         => 100,
            'orderby'                => 'date',
            'order'                  => 'DESC',
            'no_found_rows'          => true,
            'update_post_term_cache' => false,
        ] );

        $pages_list = [];
        $posts_list = [];
        $faq_list   = [];

        if ( $query->have_posts() ) {
            while ( $query->have_posts() ) {
                $query->the_post();
                $post_id   = get_the_ID();
                $post_type = get_post_type( $post_id );

                // Skip if marked noindex
                $meta = get_post_meta( $post_id, AIVISION_META_KEY, true );
                if ( is_array( $meta ) && isset( $meta['meta_robots'] ) && str_contains( strtolower( $meta['meta_robots'] ), 'noindex' ) ) {
                    continue;
                }

                $title     = get_the_title( $post_id );
                $permalink = get_permalink( $post_id );

                // Extract description
                $desc = '';
                if ( is_array( $meta ) && ! empty( $meta['meta_description'] ) ) {
                    $desc = $meta['meta_description'];
                } else {
                    $desc = wp_strip_all_tags( get_the_excerpt( $post_id ) );
                }

                if ( mb_strlen( $desc, 'UTF-8' ) > 140 ) {
                    $desc = mb_substr( $desc, 0, 137, 'UTF-8' ) . '...';
                }

                $item = "- [{$title}]({$permalink})";
                if ( $desc ) {
                    $item .= ": {$desc}";
                }

                if ( $post_type === 'page' ) {
                    $pages_list[] = $item;
                } else {
                    $posts_list[] = $item;
                }

                // Collect FAQs from post schemas
                if ( is_array( $meta ) && ! empty( $meta['schemas'] ) ) {
                    foreach ( $meta['schemas'] as $schema ) {
                        if ( isset( $schema['type'] ) && strtolower( $schema['type'] ) === 'faqpage' && ! empty( $schema['json'] ) ) {
                            $decoded = json_decode( $schema['json'], true );
                            if ( ! empty( $decoded['mainEntity'] ) && is_array( $decoded['mainEntity'] ) ) {
                                foreach ( $decoded['mainEntity'] as $qna ) {
                                    $q = $qna['name'] ?? '';
                                    $a = $qna['acceptedAnswer']['text'] ?? '';
                                    if ( $q && $a && count( $faq_list ) < 20 ) {
                                        $faq_list[] = "**Q: " . trim( $q ) . "**\n" . trim( wp_strip_all_tags( $a ) ) . "\n*Source: [{$title}]({$permalink})*";
                                    }
                                }
                            }
                        }
                    }
                }
            }
            wp_reset_postdata();
        }

        if ( ! empty( $pages_list ) ) {
            $md .= "## Core Pages & Services\n";
            $md .= implode( "\n", $pages_list ) . "\n\n";
        }

        if ( ! empty( $posts_list ) ) {
            $md .= "## Knowledge Base & Articles\n";
            $md .= implode( "\n", $posts_list ) . "\n\n";
        }

        if ( ! empty( $faq_list ) ) {
            $md .= "## Frequently Asked Questions (Q&A)\n";
            $md .= implode( "\n\n", $faq_list ) . "\n\n";
        }

        // Optional full markdown documentation link
        $full_url = home_url( '/llms-full.txt' );
        $md .= "## Optional / Extended Documentation\n";
        $md .= "- [Complete Site Knowledge Base (Full Content)]({$full_url}): Comprehensive, uncompressed full text of all articles and pages for deep LLM context ingestion.\n";

        return $md;
    }

    /**
     * Dynamic /llms-full.txt Generator (Full Text Body Feed)
     */
    public static function generate_full_markdown() {
        $settings   = get_option( 'aivision_settings', [] );
        $site_title = get_bloginfo( 'name' );
        $site_desc  = get_bloginfo( 'description' );
        $ai_bio     = ! empty( $settings['site_ai_bio'] ) ? trim( $settings['site_ai_bio'] ) : '';

        $md = "# {$site_title} — Full Knowledge Base\n\n";

        if ( $ai_bio ) {
            $md .= "> {$ai_bio}\n\n";
        } elseif ( $site_desc ) {
            $md .= "> {$site_desc}\n\n";
        }

        $md .= "---\n\n";

        $query = new WP_Query( [
            'post_type'              => [ 'page', 'post' ],
            'post_status'            => 'publish',
            'posts_per_page'         => 50,
            'orderby'                => 'date',
            'order'                  => 'DESC',
            'no_found_rows'          => true,
            'update_post_term_cache' => false,
        ] );

        if ( $query->have_posts() ) {
            while ( $query->have_posts() ) {
                $query->the_post();
                $post_id = get_the_ID();

                $meta = get_post_meta( $post_id, AIVISION_META_KEY, true );
                if ( is_array( $meta ) && isset( $meta['meta_robots'] ) && str_contains( strtolower( $meta['meta_robots'] ), 'noindex' ) ) {
                    continue;
                }

                $title     = get_the_title( $post_id );
                $permalink = get_permalink( $post_id );
                $date      = get_the_date( 'Y-m-d', $post_id );
                $author    = get_the_author_meta( 'display_name', get_post_field( 'post_author', $post_id ) );
                $content   = get_the_content( null, false, $post_id );

                // Clean content to markdown-friendly plain text
                $content = preg_replace( '/<h([1-6])[^>]*>(.*?)<\/h\1>/is', "\n\n### $2\n\n", $content );
                $content = preg_replace( '/<li[^>]*>(.*?)<\/li>/is', "\n- $1", $content );
                $content = wp_strip_all_tags( $content );
                $content = preg_replace( "/\n{3,}/", "\n\n", trim( $content ) );

                $md .= "## {$title}\n";
                $md .= "- **URL**: {$permalink}\n";
                $md .= "- **Published**: {$date}\n";
                if ( $author ) {
                    $md .= "- **Author**: {$author}\n";
                }
                $md .= "\n{$content}\n\n";
                $md .= "---\n\n";
            }
            wp_reset_postdata();
        }

        return $md;
    }

    public static function render_endpoints() {
        if ( get_query_var( 'aivision_llmstxt' ) ) {
            while ( ob_get_level() ) {
                ob_end_clean();
            }
            $md = self::generate_markdown();
            header( 'Content-Type: text/plain; charset=utf-8' );
            header( 'X-Robots-Tag: noindex, follow', true );
            echo $md;
            exit;
        }

        if ( get_query_var( 'aivision_llmstxt_full' ) ) {
            while ( ob_get_level() ) {
                ob_end_clean();
            }
            $md = self::generate_full_markdown();
            header( 'Content-Type: text/plain; charset=utf-8' );
            header( 'X-Robots-Tag: noindex, follow', true );
            echo $md;
            exit;
        }
    }

    public static function write_physical_file() {
        $md   = self::generate_markdown();
        $path = rtrim( ABSPATH, '/\\' ) . '/llms.txt';
        $dir  = dirname( $path );

        if ( file_exists( $path ) && is_writable( $dir ) && ! is_writable( $path ) ) {
            @unlink( $path );
        }

        $written = @file_put_contents( $path, $md );
        return [
            'success' => ( $written !== false ),
            'url'     => home_url( '/llms.txt' ),
        ];
    }

    public static function write_physical_full_file() {
        $md   = self::generate_full_markdown();
        $path = rtrim( ABSPATH, '/\\' ) . '/llms-full.txt';
        $dir  = dirname( $path );

        if ( file_exists( $path ) && is_writable( $dir ) && ! is_writable( $path ) ) {
            @unlink( $path );
        }

        $written = @file_put_contents( $path, $md );
        return [
            'success' => ( $written !== false ),
            'url'     => home_url( '/llms-full.txt' ),
        ];
    }

    public static function auto_sync() {
        if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) return;
        self::write_physical_file();
        self::write_physical_full_file();
    }

    public static function auto_sync_status( $new_status, $old_status, $post ) {
        if ( $new_status === 'publish' || $old_status === 'publish' ) {
            self::auto_sync();
        }
    }
}
