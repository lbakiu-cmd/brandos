<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class AIVision_Admin {

    public static function init() {
        add_action( 'admin_menu',            [ __CLASS__, 'register_menu' ] );
        add_action( 'admin_enqueue_scripts', [ __CLASS__, 'enqueue' ] );
        add_action( 'wp_ajax_aivision_save_settings', [ __CLASS__, 'ajax_save_settings' ] );
        add_action( 'wp_ajax_aivision_robots_preview', [ __CLASS__, 'ajax_robots_preview' ] );
        add_action( 'wp_ajax_aivision_auto_optimize_robots', [ __CLASS__, 'ajax_auto_optimize_robots' ] );
        add_action( 'wp_ajax_aivision_generate_sitemap', [ __CLASS__, 'ajax_generate_sitemap' ] );
        add_action( 'wp_ajax_aivision_generate_llmstxt', [ __CLASS__, 'ajax_generate_llmstxt' ] );
        add_action( 'wp_ajax_aivision_generate_llmstxt_full', [ __CLASS__, 'ajax_generate_llmstxt_full' ] );
        add_action( 'wp_ajax_aivision_filter_dashboard_content', [ __CLASS__, 'ajax_filter_dashboard_content' ] );

        // Add SEO, AEO, and GEO score columns to standard Posts and Pages list tables
        add_filter( 'manage_posts_columns',       [ __CLASS__, 'add_posts_columns' ] );
        add_action( 'manage_posts_custom_column', [ __CLASS__, 'render_posts_columns' ], 10, 2 );
        add_filter( 'manage_pages_columns',       [ __CLASS__, 'add_posts_columns' ] );
        add_action( 'manage_pages_custom_column', [ __CLASS__, 'render_posts_columns' ], 10, 2 );
    }

    public static function register_menu() {
        add_menu_page(
            'AIVision SEO',
            'AIVision SEO',
            'manage_options',
            'aivision-seo',
            [ __CLASS__, 'page_dashboard' ],
            'data:image/svg+xml;base64,' . base64_encode('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="none" stroke="#fff" stroke-width="1.5"/><path d="M6 14l2-4 2 2 2-5 2 3" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="4" r="1.5" fill="#fff"/></svg>'),
            80
        );
        add_submenu_page( 'aivision-seo', 'Dashboard',        'Dashboard',        'manage_options', 'aivision-seo',           [ __CLASS__, 'page_dashboard' ] );
        add_submenu_page( 'aivision-seo', 'AI Crawlers',      'AI Crawlers',      'manage_options', 'aivision-robots',         [ __CLASS__, 'page_robots' ] );
        add_submenu_page( 'aivision-seo', 'Settings',         'Settings',         'manage_options', 'aivision-settings-page',  [ __CLASS__, 'page_settings' ] );
    }

    public static function enqueue( $hook ) {
        $pages = [ 'toplevel_page_aivision-seo', 'aivision-seo_page_aivision-robots', 'aivision-seo_page_aivision-settings-page' ];
        $is_meta = in_array( $hook, [ 'post.php', 'post-new.php', 'edit.php' ] );
        if ( ! in_array( $hook, $pages ) && ! $is_meta ) return;

        wp_enqueue_style(  'aivision-admin-v141', AIVISION_URL . 'admin/css/admin.css', [], AIVISION_VERSION );
        if ( $hook !== 'edit.php' ) {
            wp_enqueue_script( 'aivision-admin-v141', AIVISION_URL . 'admin/js/admin.js',  [ 'jquery', 'wp-util' ], AIVISION_VERSION, true );
            wp_localize_script( 'aivision-admin-v141', 'aiVision', [
                'ajax_url' => admin_url( 'admin-ajax.php' ),
                'nonce'    => wp_create_nonce( 'aivision_nonce' ),
                'schema_templates' => AIVision_Schema::templates(),
            ] );
        }
    }

    public static function add_posts_columns( $columns ) {
        $columns['aivision_seo'] = 'SEO';
        $columns['aivision_aeo'] = 'AEO';
        $columns['aivision_geo'] = 'GEO';
        return $columns;
    }

    public static function render_posts_columns( $column, $post_id ) {
        $meta = get_post_meta( $post_id, AIVISION_META_KEY, true ) ?: [];
        if ( $column === 'aivision_seo' ) {
            $seo = AIVision_Analyzer::seo_score( $post_id, $meta );
            echo '<span class="aivision-score-badge" style="background:' . esc_attr( $seo['grade']['color'] ) . '; font-size: 11px; padding: 2px 7px;">' . esc_html( $seo['score'] ) . '%</span>';
        } elseif ( $column === 'aivision_aeo' ) {
            $aeo = AIVision_Analyzer::aeo_score( $post_id, $meta );
            echo '<span class="aivision-score-badge" style="background:' . esc_attr( $aeo['grade']['color'] ) . '; font-size: 11px; padding: 2px 7px;">' . esc_html( $aeo['score'] ) . '%</span>';
        } elseif ( $column === 'aivision_geo' ) {
            $geo = AIVision_Analyzer::geo_score( $post_id, $meta );
            echo '<span class="aivision-score-badge" style="background:' . esc_attr( $geo['grade']['color'] ) . '; font-size: 11px; padding: 2px 7px;">' . esc_html( $geo['score'] ) . '%</span>';
        }
    }

    // ── Dashboard ─────────────────────────────────────────────────────────────
    public static function page_dashboard() {
        global $wpdb;

        // Stats: posts with meta
        $posts_with_meta = $wpdb->get_var(
            $wpdb->prepare( "SELECT COUNT(DISTINCT post_id) FROM {$wpdb->postmeta} WHERE meta_key = %s", AIVISION_META_KEY )
        );
        $post_counts = wp_count_posts( 'post' );
        $page_counts = wp_count_posts( 'page' );
        $total_posts = ( (int) ( $post_counts->publish ?? 0 ) ) + ( (int) ( $page_counts->publish ?? 0 ) );

        // Initial content dataset
        $content_data = self::get_dashboard_filtered_posts( 'all', 'all', 'latest', '' );
        $recent_items = $content_data['items'];
        $stats        = $content_data['stats'];

        // Settings
        $settings = get_option( 'aivision_settings', [] );
        $ai_bots_count = count( array_filter( AIVision_Robots::ALL_BOTS, fn($b) => $b['type'] === 'ai' ) );
        $allowed_count = count( array_intersect( $settings['allowed_bots'] ?? AIVision_Robots::OPTIMAL_ALLOWED_BOTS, array_keys( AIVision_Robots::ALL_BOTS ) ) );
        ?>
        <div class="aivision-wrap">
            <div class="aivision-header">
                <div class="aivision-logo">
                    <span class="aivision-logo-icon">🎯</span>
                    <div>
                        <h1 style="display:inline-flex; align-items:center; gap:8px;">AIVision SEO, AEO &amp; GEO Engine <span class="aivision-version-badge" style="background:rgba(59, 130, 246, 0.18); color:#60a5fa; border:1px solid rgba(59, 130, 246, 0.35); font-size:11px; font-weight:700; padding:2px 8px; border-radius:12px; letter-spacing:0.4px;">v<?php echo esc_html( AIVISION_VERSION ); ?></span></h1>
                        <p>Real-time optimization for Search Engines, Answer Engines &amp; Generative AI</p>
                    </div>
                </div>
                <div class="aivision-header-stats">
                    <div class="aivision-stat-pill">
                        <span class="aivision-stat-val"><?php echo esc_html($posts_with_meta); ?>/<?php echo esc_html($total_posts); ?></span>
                        <span class="aivision-stat-lbl">Optimized Content</span>
                    </div>
                    <div class="aivision-stat-pill">
                        <span class="aivision-stat-val"><?php echo esc_html($allowed_count); ?>/<?php echo esc_html($ai_bots_count); ?></span>
                        <span class="aivision-stat-lbl">AI Crawlers Allowed</span>
                    </div>
                </div>
            </div>

            <div class="aivision-tab-panel" id="av-panel-overview">
                <!-- 3 Pillars Feature Cards -->
                <div class="aivision-grid-3">
                    <div class="aivision-card aivision-feature-card">
                        <div class="aivision-card-icon" style="background:#e0f2fe; color:#0284c7;">📊</div>
                        <h3>1. Search Engines (SEO)</h3>
                        <p>Classic on-page optimization for Google &amp; Bing: titles, meta descriptions, keyword density, headings, and internal linking.</p>
                    </div>
                    <div class="aivision-card aivision-feature-card">
                        <div class="aivision-card-icon" style="background:#fef3c7; color:#d97706;">💬</div>
                        <h3>2. Answer Engines (AEO)</h3>
                        <p>Structured Q&amp;A blocks, direct snippet-bait paragraphs, numbered steps, and FAQPage schemas to win Google Featured Snippets &amp; AI Overviews.</p>
                    </div>
                    <div class="aivision-card aivision-feature-card">
                        <div class="aivision-card-icon" style="background:#ede9fe; color:#7c3aed;">🤖</div>
                        <h3>3. Generative Engines (GEO)</h3>
                        <p>High data density, external authoritative citations, E-E-A-T credentials, /llms.txt machine feeds, and open AI crawler access for OpenAI ChatGPT and Google Gemini.</p>
                    </div>
                </div>

                <!-- Content Optimization & Quality Center -->
                <div class="aivision-card" style="margin-top:20px;" id="av-dashboard-content-card">
                    <div class="aivision-card-header" style="flex-wrap:wrap; gap:12px; justify-content:space-between; align-items:center;">
                        <div>
                            <h2>Content Optimization &amp; Quality</h2>
                            <p style="font-size:12px; color:var(--av-gray-500); margin:3px 0 0;">Filter, search, and identify unoptimized or low-scoring content across your site</p>
                        </div>
                        <div id="av-content-quick-pills" class="av-quick-pills" style="display:flex; gap:6px; flex-wrap:wrap;">
                            <button type="button" class="av-pill-btn active" data-status="all">
                                📊 All (<span id="av-stat-all"><?php echo esc_html($stats['total']); ?></span>)
                            </button>
                            <button type="button" class="av-pill-btn av-pill-red" data-status="low_score">
                                🔴 Low Quality (<span id="av-stat-low"><?php echo esc_html($stats['low_score']); ?></span>)
                            </button>
                            <button type="button" class="av-pill-btn av-pill-orange" data-status="not_optimized">
                                ⚠️ Needs Optimization (<span id="av-stat-unopt"><?php echo esc_html($stats['not_optimized']); ?></span>)
                            </button>
                            <button type="button" class="av-pill-btn av-pill-green" data-status="high_score">
                                🟢 High Quality (<span id="av-stat-high"><?php echo esc_html($stats['high_score']); ?></span>)
                            </button>
                            <button type="button" class="av-pill-btn av-pill-gray" data-status="no_schema">
                                🏷️ Missing Schema (<span id="av-stat-schema"><?php echo esc_html($stats['no_schema']); ?></span>)
                            </button>
                        </div>
                    </div>

                    <!-- Filter & Search Controls Toolbar -->
                    <div class="av-content-filter-toolbar">
                        <div class="av-filter-item">
                            <label for="av-filter-status">Quality / Status</label>
                            <select id="av-filter-status" class="av-filter-control">
                                <option value="all">📊 All Content</option>
                                <option value="low_score">🔴 Low Quality (&lt; 50%)</option>
                                <option value="not_optimized">⚠️ Needs Optimization / Unscored</option>
                                <option value="medium_score">🟡 Fair Quality (50–74%)</option>
                                <option value="high_score">🟢 Highly Optimized (75%+)</option>
                                <option value="no_schema">🏷️ Missing Schemas</option>
                                <option value="no_keyword">🎯 Missing Focus Keyword</option>
                            </select>
                        </div>

                        <div class="av-filter-item">
                            <label for="av-filter-post-type">Post Type</label>
                            <select id="av-filter-post-type" class="av-filter-control">
                                <option value="all">All Types (Posts &amp; Pages)</option>
                                <option value="post">📝 Posts only</option>
                                <option value="page">📄 Pages only</option>
                            </select>
                        </div>

                        <div class="av-filter-item">
                            <label for="av-filter-sort">Sort By</label>
                            <select id="av-filter-sort" class="av-filter-control">
                                <option value="latest">⏱️ Latest Date</option>
                                <option value="score_asc">📉 Lowest Overall Score First</option>
                                <option value="seo_asc">📉 Lowest SEO Score First</option>
                                <option value="aeo_asc">📉 Lowest AEO Score First</option>
                                <option value="geo_asc">📉 Lowest GEO Score First</option>
                                <option value="score_desc">📈 Highest Score First</option>
                                <option value="title_asc">🔤 Title (A–Z)</option>
                            </select>
                        </div>

                        <div class="av-filter-item av-filter-item-search">
                            <label for="av-filter-search">Search Content</label>
                            <input type="text" id="av-filter-search" class="av-filter-control" placeholder="🔍 Search title or keyword...">
                        </div>

                        <div class="av-filter-item av-filter-actions">
                            <button type="button" id="av-filter-reset" class="aivision-btn aivision-btn-secondary aivision-btn-sm" style="display:none;">↺ Reset Filters</button>
                        </div>
                    </div>

                    <!-- Posts Table Container -->
                    <div id="av-dashboard-table-wrap" style="position:relative; min-height:120px;">
                        <table class="aivision-table" id="av-dashboard-content-table">
                            <thead>
                                <tr>
                                    <th>Content Title &amp; Type</th>
                                    <th>SEO</th>
                                    <th>AEO</th>
                                    <th>GEO</th>
                                    <th>Avg Score</th>
                                    <th>Schemas</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php if ( empty( $recent_items ) ) : ?>
                                    <tr class="av-empty-row">
                                        <td colspan="7" style="text-align:center; padding:32px 16px; color:var(--av-gray-500);">
                                            <div style="font-size:24px; margin-bottom:6px;">🔍</div>
                                            <strong>No content found matching the selected filters.</strong>
                                            <p style="margin:4px 0 0; font-size:12px;">Try adjusting your search criteria or resetting filters.</p>
                                        </td>
                                    </tr>
                                <?php else : ?>
                                    <?php foreach ( $recent_items as $item ) : ?>
                                    <tr data-post-id="<?php echo esc_attr( $item['id'] ); ?>" data-post-type="<?php echo esc_attr( $item['post_type'] ); ?>">
                                        <td>
                                            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                                                <span class="aivision-badge aivision-badge-gray" style="font-size:10px; text-transform:uppercase;"><?php echo esc_html( $item['post_type'] ); ?></span>
                                                <strong><?php echo esc_html( $item['title'] ); ?></strong>
                                                <?php if ( ! empty( $item['focus_kw'] ) ) : ?>
                                                    <span style="font-size:11px; color:#4f46e5; background:#eef2ff; padding:1px 6px; border-radius:4px;" title="Focus Keyword">🎯 <?php echo esc_html( $item['focus_kw'] ); ?></span>
                                                <?php endif; ?>
                                            </div>
                                            <div class="aivision-meta-url">
                                                <a href="<?php echo esc_url( $item['url'] ); ?>" target="_blank"><?php echo esc_url( $item['url'] ); ?></a>
                                                <span style="color:#94a3b8; margin-left:8px;">📅 <?php echo esc_html( $item['date_str'] ); ?></span>
                                            </div>
                                        </td>
                                        <td><span class="aivision-score-badge" style="background:<?php echo esc_attr( $item['seo_color'] ); ?>"><?php echo esc_html( $item['seo_score'] ); ?>%</span></td>
                                        <td><span class="aivision-score-badge" style="background:<?php echo esc_attr( $item['aeo_color'] ); ?>"><?php echo esc_html( $item['aeo_score'] ); ?>%</span></td>
                                        <td><span class="aivision-score-badge" style="background:<?php echo esc_attr( $item['geo_color'] ); ?>"><?php echo esc_html( $item['geo_score'] ); ?>%</span></td>
                                        <td><span class="aivision-score-badge" style="background:<?php echo esc_attr( $item['avg_color'] ); ?>; font-weight:700;"><?php echo esc_html( $item['avg_score'] ); ?>%</span></td>
                                        <td><?php echo $item['schemas'] > 0 ? '<span class="aivision-badge aivision-badge-green">' . esc_html( $item['schemas'] ) . ' schema' . ( $item['schemas'] > 1 ? 's' : '' ) . '</span>' : '<span class="aivision-badge aivision-badge-gray">None</span>'; ?></td>
                                        <td><a href="<?php echo esc_url( $item['edit_url'] ); ?>" class="aivision-btn aivision-btn-sm aivision-btn-primary">Edit &amp; Optimize</a></td>
                                    </tr>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                            </tbody>
                        </table>
                        <div id="av-dashboard-table-loading" style="display:none; position:absolute; inset:0; background:rgba(255,255,255,0.75); backdrop-filter:blur(2px); align-items:center; justify-content:center; font-weight:600; color:var(--av-primary); z-index:5;">
                            <div style="padding:8px 16px; background:#fff; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.1); border:1px solid var(--av-gray-200);">
                                🔄 Filtering content...
                            </div>
                        </div>
                    </div>

                    <div id="av-dashboard-table-footer" style="padding:10px 16px; background:var(--av-gray-50); border-top:1px solid var(--av-gray-200); display:flex; justify-content:space-between; align-items:center; font-size:12px; color:var(--av-gray-500); flex-wrap:wrap; gap:8px;">
                        <span id="av-filter-count-info">Showing <?php echo esc_html( count( $recent_items ) ); ?> of <?php echo esc_html( $stats['total'] ); ?> total items</span>
                    </div>
                </div>

                <!-- GEO & AEO Tips -->
                <div class="aivision-card aivision-card-tips">
                    <div class="aivision-card-header"><h2>💡 Key AEO &amp; GEO Optimization Guidelines</h2></div>
                    <div class="aivision-tips-grid">
                        <?php foreach ( self::geo_tips() as $tip ) : ?>
                        <div class="aivision-tip">
                            <div class="aivision-tip-icon"><?php echo $tip['icon']; ?></div>
                            <div>
                                <strong><?php echo esc_html($tip['title']); ?></strong>
                                <p><?php echo esc_html($tip['desc']); ?></p>
                            </div>
                        </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }

    // ── AJAX: Filter Dashboard Content ─────────────────────────────────────────
    public static function ajax_filter_dashboard_content() {
        check_ajax_referer( 'aivision_nonce', 'nonce' );
        if ( ! current_user_can( 'edit_posts' ) ) wp_send_json_error( 'Unauthorized' );

        $post_type     = sanitize_text_field( $_POST['post_type'] ?? 'all' );
        $status_filter = sanitize_text_field( $_POST['status_filter'] ?? 'all' );
        $sort_by       = sanitize_text_field( $_POST['sort_by'] ?? 'latest' );
        $search        = sanitize_text_field( $_POST['search'] ?? '' );

        $result = self::get_dashboard_filtered_posts( $post_type, $status_filter, $sort_by, $search );

        wp_send_json_success( $result );
    }

    // ── Helper: Get Filtered Posts for Dashboard ──────────────────────────────
    public static function get_dashboard_filtered_posts( $post_type = 'all', $status_filter = 'all', $sort_by = 'latest', $search = '' ) {
        $types = ( $post_type === 'all' || empty( $post_type ) ) ? [ 'post', 'page' ] : [ $post_type ];

        $args = [
            'numberposts'      => -1,
            'post_status'      => 'publish',
            'post_type'        => $types,
            'suppress_filters' => false,
        ];
        if ( ! empty( $search ) ) {
            $args['s'] = $search;
        }

        $all_posts = get_posts( $args );

        $filtered_data = [];
        $stats = [
            'total'          => 0,
            'low_score'      => 0,
            'not_optimized'  => 0,
            'medium_score'   => 0,
            'high_score'     => 0,
            'no_schema'      => 0,
            'no_keyword'     => 0,
        ];

        foreach ( $all_posts as $p ) {
            $meta     = get_post_meta( $p->ID, AIVISION_META_KEY, true ) ?: [];
            $seo      = AIVision_Analyzer::seo_score( $p->ID, $meta );
            $aeo      = AIVision_Analyzer::aeo_score( $p->ID, $meta );
            $geo      = AIVision_Analyzer::geo_score( $p->ID, $meta );
            $avg      = (int) round( ( $seo['score'] + $aeo['score'] + $geo['score'] ) / 3 );
            $sc_count = count( $meta['schemas'] ?? [] );
            $focus_kw = $meta['focus_keyword'] ?? '';
            $has_meta = ! empty( $meta ) && ( ! empty( $meta['meta_title'] ) || ! empty( $focus_kw ) || $sc_count > 0 );
            $is_low   = ( $seo['score'] < 50 || $aeo['score'] < 50 || $geo['score'] < 50 || $avg < 50 );
            $is_unopt = ( ! $has_meta || $avg < 50 );

            // Update stats counter
            $stats['total']++;
            if ( $is_low ) $stats['low_score']++;
            if ( $is_unopt ) $stats['not_optimized']++;
            if ( $avg >= 50 && $avg < 75 ) $stats['medium_score']++;
            if ( $avg >= 75 ) $stats['high_score']++;
            if ( $sc_count === 0 ) $stats['no_schema']++;
            if ( empty( $focus_kw ) ) $stats['no_keyword']++;

            // Apply status filter
            $include = true;
            switch ( $status_filter ) {
                case 'low_score':
                    $include = $is_low;
                    break;
                case 'not_optimized':
                    $include = $is_unopt;
                    break;
                case 'medium_score':
                    $include = ( $avg >= 50 && $avg < 75 );
                    break;
                case 'high_score':
                    $include = ( $avg >= 75 );
                    break;
                case 'no_schema':
                    $include = ( $sc_count === 0 );
                    break;
                case 'no_keyword':
                    $include = empty( $focus_kw );
                    break;
                case 'all':
                default:
                    $include = true;
                    break;
            }

            if ( $include ) {
                $filtered_data[] = [
                    'id'         => $p->ID,
                    'title'      => $p->post_title ?: '(no title)',
                    'post_type'  => $p->post_type,
                    'url'        => get_permalink( $p->ID ),
                    'edit_url'   => get_edit_post_link( $p->ID, '' ),
                    'date'       => get_the_time( 'U', $p->ID ),
                    'date_str'   => get_the_date( 'M j, Y', $p->ID ),
                    'seo_score'  => $seo['score'],
                    'seo_color'  => $seo['grade']['color'],
                    'seo_label'  => $seo['grade']['label'],
                    'aeo_score'  => $aeo['score'],
                    'aeo_color'  => $aeo['grade']['color'],
                    'aeo_label'  => $aeo['grade']['label'],
                    'geo_score'  => $geo['score'],
                    'geo_color'  => $geo['grade']['color'],
                    'geo_label'  => $geo['grade']['label'],
                    'avg_score'  => $avg,
                    'avg_color'  => AIVision_Analyzer::grade( $avg )['color'],
                    'avg_label'  => AIVision_Analyzer::grade( $avg )['label'],
                    'schemas'    => $sc_count,
                    'focus_kw'   => $focus_kw,
                    'has_meta'   => $has_meta,
                ];
            }
        }

        // Apply sorting
        usort( $filtered_data, function( $a, $b ) use ( $sort_by ) {
            switch ( $sort_by ) {
                case 'score_asc':
                    return $a['avg_score'] <=> $b['avg_score'];
                case 'score_desc':
                    return $b['avg_score'] <=> $a['avg_score'];
                case 'seo_asc':
                    return $a['seo_score'] <=> $b['seo_score'];
                case 'aeo_asc':
                    return $a['aeo_score'] <=> $b['aeo_score'];
                case 'geo_asc':
                    return $a['geo_score'] <=> $b['geo_score'];
                case 'title_asc':
                    return strcasecmp( $a['title'], $b['title'] );
                case 'oldest':
                    return $a['date'] <=> $b['date'];
                case 'latest':
                default:
                    return $b['date'] <=> $a['date'];
            }
        } );

        return [
            'items' => $filtered_data,
            'count' => count( $filtered_data ),
            'stats' => $stats,
        ];
    }

    // ── AI Crawlers / Robots Page ─────────────────────────────────────────────
    public static function page_robots() {
        $settings = get_option( 'aivision_settings', [] );
        $allowed  = $settings['allowed_bots'] ?? AIVision_Robots::OPTIMAL_ALLOWED_BOTS;
        ?>
        <div class="aivision-wrap">
            <div class="aivision-header">
                <div class="aivision-logo"><span class="aivision-logo-icon">🤖</span><div><h1 style="display:inline-flex; align-items:center; gap:8px;">AI Crawler &amp; Robots Manager <span class="aivision-version-badge" style="background:rgba(59, 130, 246, 0.18); color:#60a5fa; border:1px solid rgba(59, 130, 246, 0.35); font-size:11px; font-weight:700; padding:2px 8px; border-radius:12px; letter-spacing:0.4px;">v<?php echo esc_html( AIVISION_VERSION ); ?></span></h1><p>Control crawler access and auto-optimize your robots.txt file</p></div></div>
                <button type="button" class="aivision-btn aivision-btn-primary" id="av-auto-optimize-robots-btn" style="background:#4f46e5; border-color:#4338ca;">⚡ Auto-Optimize robots.txt (1-Click)</button>
            </div>
            <div class="aivision-two-col">
                <div class="aivision-card" style="flex:2">
                    <div class="aivision-card-header"><h2>Bot Access Control</h2></div>
                    <div class="aivision-bot-section-label">🔍 Search Engines</div>
                    <?php self::render_bot_list( 'search', $allowed ); ?>
                    <div class="aivision-bot-section-label" style="margin-top:16px">🤖 AI / LLM Crawlers</div>
                    <?php self::render_bot_list( 'ai', $allowed ); ?>
                    <div class="aivision-bot-section-label" style="margin-top:16px">📣 Social Crawlers</div>
                    <?php self::render_bot_list( 'social', $allowed ); ?>
                    <div style="margin-top:20px; display:flex; gap:10px;">
                        <button type="button" class="aivision-btn aivision-btn-primary" id="av-save-bots" data-action="aivision_save_settings">Save Bot Settings</button>
                    </div>
                </div>
                <div class="aivision-card">
                    <div class="aivision-card-header"><h2>robots.txt Preview</h2><button type="button" class="aivision-btn aivision-btn-sm" id="av-refresh-robots">Refresh</button></div>
                    <pre id="av-robots-preview" class="aivision-code" style="white-space:pre-wrap;font-size:12px;min-height:320px">Loading...</pre>
                    <p style="margin-top:8px;font-size:12px;color:#666">Live preview of your robots.txt served to search &amp; AI crawlers. <a href="<?php echo esc_url( home_url('/robots.txt') ); ?>" target="_blank">View live →</a></p>
                </div>
            </div>
        </div>
        <?php
    }

    private static function render_bot_list( $type, $allowed ) {
        foreach ( AIVision_Robots::ALL_BOTS as $bot => $info ) {
            if ( $info['type'] !== $type ) continue;
            $checked = in_array( $bot, $allowed, true );
            ?>
            <div class="aivision-bot-row">
                <label class="aivision-toggle">
                    <input type="checkbox" name="allowed_bots[]" value="<?php echo esc_attr($bot); ?>" <?php checked($checked); ?>>
                    <span class="aivision-toggle-slider"></span>
                </label>
                <div class="aivision-bot-info">
                    <strong><?php echo esc_html($info['name']); ?></strong>
                    <code><?php echo esc_html($bot); ?></code>
                </div>
                <span class="aivision-badge aivision-badge-<?php echo $checked ? 'green' : 'red'; ?>"><?php echo $checked ? 'Allowed' : 'Blocked'; ?></span>
            </div>
            <?php
        }
    }

    // ── Settings Page ─────────────────────────────────────────────────────────
    public static function page_settings() {
        $settings  = get_option( 'aivision_settings', [] );
        $site_type = $settings['site_type'] ?? 'general';
        $site_ai_bio = $settings['site_ai_bio'] ?? '';
        $aivisibility_settings = AIVisibility_Integration::get_settings();
        $is_connected = AIVisibility_Integration::is_connected();
        ?>
        <div class="aivision-wrap">
            <div class="aivision-header">
                <div class="aivision-logo"><span class="aivision-logo-icon">⚙️</span><div><h1 style="display:inline-flex; align-items:center; gap:8px;">Settings &amp; Integrations <span class="aivision-version-badge" style="background:rgba(59, 130, 246, 0.18); color:#60a5fa; border:1px solid rgba(59, 130, 246, 0.35); font-size:11px; font-weight:700; padding:2px 8px; border-radius:12px; letter-spacing:0.4px;">v<?php echo esc_html( AIVISION_VERSION ); ?></span></h1><p>Configure AIVision SEO parameters and AIVisibility SEO Cloud connection</p></div></div>
            </div>

            <!-- AIVisibility SEO Cloud Integration Card -->
            <div class="aivision-card" style="border: 1px solid <?php echo $is_connected ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.08)'; ?>; background: <?php echo $is_connected ? 'linear-gradient(180deg, rgba(30, 58, 138, 0.25) 0%, rgba(15, 23, 42, 0.95) 100%)' : 'rgba(30, 41, 59, 0.7)'; ?>; margin-bottom: 24px;">
                <div class="aivision-card-header" style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:22px;">⚡</span>
                        <div>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <h2 style="margin:0; font-size:16px; font-weight:700;">AIVisibility SEO Cloud &amp; AI Integration</h2>
                                <span class="aivision-version-badge" style="background:rgba(59, 130, 246, 0.2); color:#93c5fd; border:1px solid rgba(59, 130, 246, 0.45); font-size:11px; font-weight:700; padding:2px 8px; border-radius:12px; letter-spacing:0.4px;">v<?php echo esc_html( AIVISION_VERSION ); ?></span>
                                <span class="aivision-badge" style="background:rgba(16, 185, 129, 0.15); color:#34d399; border:1px solid rgba(16, 185, 129, 0.35); font-size:11px; font-weight:700; padding:2px 8px; border-radius:12px; letter-spacing:0.4px;">⚡ Auto-Updates Enabled</span>
                            </div>
                            <p style="margin:2px 0 0; font-size:12px; color:#94a3b8;">Standalone mode is 100% active. Connect to AIVisibility SEO to unlock cloud AI features.</p>
                        </div>
                    </div>
                    <div>
                        <?php if ( $is_connected ) : ?>
                            <span class="aivision-badge" style="background:#10b981; color:#fff; font-weight:600; padding:4px 10px; border-radius:20px; font-size:12px;">🟢 Connected to AIVisibility SEO</span>
                        <?php else : ?>
                            <span class="aivision-badge" style="background:#64748b; color:#fff; font-weight:600; padding:4px 10px; border-radius:20px; font-size:12px;">⚪ Standalone Mode</span>
                        <?php endif; ?>
                    </div>
                </div>

                <div style="padding: 16px 0 0;">
                    <form id="av-aivisibility-form">
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
                            <div class="aivision-form-group">
                                <label style="font-weight:600; font-size:13px; color:#e2e8f0;">AIVisibility SEO API URL</label>
                                <input type="url" name="aivisibility_api_url" id="av-aivisibility-api-url" value="<?php echo esc_attr( $aivisibility_settings['api_url'] ?: 'https://icandothat.online' ); ?>" placeholder="https://icandothat.online" style="width:100%; padding:9px 12px; border-radius:8px; background:#0f172a; border:1px solid #334155; color:#fff;">
                                <p class="aivision-hint">Your AIVisibility SEO API instance endpoint (e.g. <code>https://icandothat.online</code>).</p>
                            </div>
                            <div class="aivision-form-group">
                                <label style="font-weight:600; font-size:13px; color:#e2e8f0;">AIVisibility SEO API Key / Business Token</label>
                                <input type="text" name="aivisibility_api_key" id="av-aivisibility-api-key" value="<?php echo esc_attr( $aivisibility_settings['api_key'] ); ?>" placeholder="bos_live_..." style="width:100%; padding:9px 12px; border-radius:8px; background:#0f172a; border:1px solid #334155; color:#fff;">
                                <p class="aivision-hint">Found in your AIVisibility SEO Dashboard → Integrations &amp; OAuth.</p>
                            </div>
                        </div>

                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-top:14px; padding-top:14px; border-top:1px solid rgba(255,255,255,0.06);">
                            <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                                <button type="button" class="aivision-btn aivision-btn-primary" id="av-test-aivisibility-btn" style="background:#3b82f6; border-color:#2563eb;">
                                    <?php echo $is_connected ? '⚡ Re-Test Connection' : '⚡ Connect to AIVisibility SEO'; ?>
                                </button>
                                <button type="button" class="aivision-btn" id="av-check-updates-btn" style="background:rgba(255,255,255,0.08); color:#e2e8f0; border:1px solid rgba(255,255,255,0.18);">
                                    🚀 Check for Updates
                                </button>
                                <?php if ( $is_connected ) : ?>
                                    <button type="button" class="aivision-btn aivision-btn-secondary" id="av-sync-aivisibility-btn">🔄 Sync Telemetry</button>
                                    <button type="button" class="aivision-btn" id="av-disconnect-aivisibility-btn" style="background:#dc2626; color:#fff; border:none;">Disconnect</button>
                                <?php endif; ?>
                            </div>
                            <?php if ( $is_connected && ! empty( $aivisibility_settings['last_synced_at'] ) ) : ?>
                                <span style="font-size:12px; color:#94a3b8;">Last Synced: <?php echo esc_html( $aivisibility_settings['last_synced_at'] ); ?></span>
                            <?php endif; ?>
                        </div>
                        <div id="av-aivisibility-status" style="margin-top:12px; display:none; padding:10px 14px; border-radius:8px; font-size:13px;"></div>
                    </form>

                    <!-- Feature comparison pills -->
                    <div style="margin-top:16px; background:rgba(15, 23, 42, 0.6); padding:12px 16px; border-radius:10px; border:1px solid rgba(255,255,255,0.04);">
                        <span style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#94a3b8; display:block; margin-bottom:8px;">Features Overview:</span>
                        <div style="display:flex; flex-wrap:wrap; gap:8px;">
                            <span style="background:rgba(255,255,255,0.06); padding:4px 8px; border-radius:6px; font-size:12px; color:#cbd5e1;">✅ 3-Pillar In-Editor Scoring (Standalone)</span>
                            <span style="background:rgba(255,255,255,0.06); padding:4px 8px; border-radius:6px; font-size:12px; color:#cbd5e1;">✅ /llms.txt &amp; robots.txt (Standalone)</span>
                            <span style="background:rgba(255,255,255,0.06); padding:4px 8px; border-radius:6px; font-size:12px; color:#cbd5e1;">✅ 14 JSON-LD Schema Types (Standalone)</span>
                            <span style="background:rgba(59, 130, 246, 0.15); border:1px solid rgba(59,130,246,0.3); padding:4px 8px; border-radius:6px; font-size:12px; color:#93c5fd;">⚡ 1-Click Remote Fix Dispatcher (AIVisibility SEO)</span>
                            <span style="background:rgba(59, 130, 246, 0.15); border:1px solid rgba(59,130,246,0.3); padding:4px 8px; border-radius:6px; font-size:12px; color:#93c5fd;">⚡ Copilot Auto-Publishing (AIVisibility SEO)</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="aivision-card">
                <div class="aivision-card-header"><h2>General Settings</h2></div>
                <form id="av-settings-form">
                    <div class="aivision-form-group">
                        <label>Site Type / Niche</label>
                        <select name="site_type">
                            <option value="general"       <?php selected($site_type,'general'); ?>>General / Blog</option>
                            <option value="local"         <?php selected($site_type,'local'); ?>>Local Business (General)</option>
                            <option value="medical"       <?php selected($site_type,'medical'); ?>>Medical &amp; Healthcare (Clinic, Dentist, Physician)</option>
                            <option value="legal"         <?php selected($site_type,'legal'); ?>>Legal &amp; Law Firm (Attorney, Law Practice)</option>
                            <option value="homeservices"  <?php selected($site_type,'homeservices'); ?>>Home Services &amp; Construction (Plumbing, Roofing, HVAC)</option>
                            <option value="restaurant"    <?php selected($site_type,'restaurant'); ?>>Restaurant &amp; Hospitality (Dining, Cafe, Hotel)</option>
                            <option value="realestate"    <?php selected($site_type,'realestate'); ?>>Real Estate (Agency, Broker, Property Management)</option>
                            <option value="financial"     <?php selected($site_type,'financial'); ?>>Financial &amp; Accounting (CPA, Tax, Insurance)</option>
                            <option value="professional"  <?php selected($site_type,'professional'); ?>>Professional Services &amp; Consulting Agency</option>
                            <option value="ecommerce"     <?php selected($site_type,'ecommerce'); ?>>E-Commerce &amp; Retail Store</option>
                            <option value="news"          <?php selected($site_type,'news'); ?>>News / Media / Magazine</option>
                        </select>
                        <p class="aivision-hint">Affects default Schema.org types, E-E-A-T analysis, and AI context parameters.</p>
                    </div>

                    <div class="aivision-form-group">
                        <label for="av-site-ai-bio">Site AI Bio &amp; Context (Injected into /llms.txt)</label>
                        <textarea name="site_ai_bio" id="av-site-ai-bio" rows="3" placeholder="e.g. Established local service provider in Seattle specializing in commercial and residential solutions, licensed master technicians, and 24/7 client support since 2012."><?php echo esc_textarea($site_ai_bio); ?></textarea>
                        <p class="aivision-hint">This description is placed at the top of your <code>/llms.txt</code> feed to define your organization's background, authority, and tone for AI models (OpenAI ChatGPT, Google Gemini).</p>
                    </div>

                    <div class="aivision-form-group">
                        <label>Default Robots Directive</label>
                        <select name="default_robots">
                            <option value="index, follow"     <?php selected($settings['default_robots'] ?? '', 'index, follow'); ?>>index, follow</option>
                            <option value="noindex, follow"   <?php selected($settings['default_robots'] ?? '', 'noindex, follow'); ?>>noindex, follow</option>
                            <option value="index, nofollow"   <?php selected($settings['default_robots'] ?? '', 'index, nofollow'); ?>>index, nofollow</option>
                            <option value="noindex, nofollow" <?php selected($settings['default_robots'] ?? '', 'noindex, nofollow'); ?>>noindex, nofollow</option>
                        </select>
                    </div>

                    <div class="aivision-form-group">
                        <label class="aivision-checkbox-label">
                            <input type="checkbox" name="ai_crawlers_enabled" value="1" <?php checked( ! empty($settings['ai_crawlers_enabled']) ); ?>>
                            Enable AI crawler directives in robots.txt
                        </label>
                        <p class="aivision-hint">Adds explicit Allow/Disallow rules for AI bots to your robots.txt file.</p>
                    </div>

                    <div class="aivision-form-group">
                        <label class="aivision-checkbox-label">
                            <input type="checkbox" name="remove_default_generator" value="1" <?php checked( ! empty($settings['remove_default_generator']) ); ?>>
                            Remove WordPress generator meta tag
                        </label>
                        <p class="aivision-hint">Hides your WordPress version from <code>&lt;meta name="generator"&gt;</code>.</p>
                    </div>

                    <div style="display:flex; gap:10px; align-items:center; margin-top:20px;">
                        <button type="submit" class="aivision-btn aivision-btn-primary">Save Settings</button>
                        <button type="button" class="aivision-btn aivision-btn-secondary" id="av-auto-optimize-robots-btn">⚡ Auto-Optimize robots.txt</button>
                    </div>
                </form>
            </div>

            <!-- XML Sitemap Card -->
            <div class="aivision-card" style="margin-top:20px">
                <div class="aivision-card-header"><h2>🗺️ XML Sitemap</h2></div>
                <div class="aivision-form-group">
                    <p>AIVision SEO generates a fast dynamic sitemap feed at <code>/sitemap.xml</code> and can write a static physical copy to the web root.</p>
                    <div style="margin-top:15px; display:flex; align-items:center; gap:15px;">
                        <button type="button" class="aivision-btn aivision-btn-primary" id="av-generate-sitemap-btn">Generate Sitemap XML</button>
                        <a href="<?php echo esc_url( home_url('/sitemap.xml') ); ?>" target="_blank" class="aivision-link" id="av-sitemap-view-link">View /sitemap.xml →</a>
                    </div>
                    <div id="av-sitemap-status" style="margin-top:12px; display:none; padding:10px; border-radius:6px; font-size:13px;"></div>
                </div>
            </div>

            <!-- LLMs.txt Card -->
            <div class="aivision-card" style="margin-top:20px">
                <div class="aivision-card-header"><h2>📄 LLMs.txt &amp; LLMs-Full.txt (AI Discovery Feeds)</h2></div>
                <div class="aivision-form-group">
                    <p>Provide structured, high-context markdown feeds for Large Language Models (OpenAI ChatGPT, Google Gemini) adhering to the <a href="https://llmstxt.org/" target="_blank">llmstxt.org</a> standard.</p>
                    <div style="margin-top:15px; display:flex; align-items:center; gap:15px; flex-wrap:wrap;">
                        <button type="button" class="aivision-btn aivision-btn-primary" id="av-generate-llmstxt-btn">Generate LLMs.txt</button>
                        <button type="button" class="aivision-btn aivision-btn-secondary" id="av-generate-llmstxt-full-btn">Generate LLMs-Full.txt</button>
                        <a href="<?php echo esc_url( home_url('/llms.txt') ); ?>" target="_blank" class="aivision-link" id="av-llmstxt-view-link">View /llms.txt →</a>
                        <a href="<?php echo esc_url( home_url('/llms-full.txt') ); ?>" target="_blank" class="aivision-link" id="av-llmstxt-full-view-link">View /llms-full.txt →</a>
                    </div>
                    <div id="av-llmstxt-status" style="margin-top:12px; display:none; padding:10px; border-radius:6px; font-size:13px;"></div>
                </div>
            </div>
        </div>
        <?php
    }

    // ── AJAX: Save Settings ───────────────────────────────────────────────────
    public static function ajax_save_settings() {
        check_ajax_referer( 'aivision_nonce', 'nonce' );
        if ( ! current_user_can('manage_options') ) wp_send_json_error('Unauthorized');

        if ( function_exists( 'opcache_reset' ) ) {
            @opcache_reset();
        }

        $current = get_option( 'aivision_settings', [] );
        $post    = $_POST;

        if ( isset( $post['site_type'] ) ) {
            $current['site_type']      = sanitize_text_field( $post['site_type'] );
            $current['site_ai_bio']    = sanitize_textarea_field( $post['site_ai_bio'] ?? '' );
            $current['default_robots'] = sanitize_text_field( $post['default_robots'] ?? 'index, follow' );
            $current['remove_default_generator'] = ! empty( $post['remove_default_generator'] );
        }

        if ( isset( $post['ai_crawlers_enabled'] ) ) {
            $current['ai_crawlers_enabled'] = ! empty( $post['ai_crawlers_enabled'] );
        }

        $is_bot_settings = isset( $post['is_bot_settings'] ) || ! isset( $post['site_type'] );

        if ( $is_bot_settings ) {
            if ( isset( $post['allowed_bots'] ) && is_array( $post['allowed_bots'] ) ) {
                $all_bot_keys = array_keys( AIVision_Robots::ALL_BOTS );
                $current['allowed_bots'] = array_intersect( array_map('sanitize_text_field', $post['allowed_bots']), $all_bot_keys );
            } else {
                $current['allowed_bots'] = [];
            }
        }

        update_option( 'aivision_settings', $current );
        
        // Auto-sync robots and llms
        AIVision_Robots::write_physical_robots();
        AIVision_LLMsTxt::auto_sync();

        wp_send_json_success( [ 'message' => 'Settings saved and feeds synced.' ] );
    }

    // ── AJAX: Auto-Optimize robots.txt ────────────────────────────────────────
    public static function ajax_auto_optimize_robots() {
        check_ajax_referer( 'aivision_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'Unauthorized' );

        $res = AIVision_Robots::apply_auto_optimize_preset();
        $preview = AIVision_Robots::get_robots_preview();

        wp_send_json_success([
            'message' => $res['message'],
            'preview' => $preview,
            'allowed_bots' => $res['allowed_bots']
        ]);
    }

    // ── AJAX: Robots Preview ──────────────────────────────────────────────────
    public static function ajax_robots_preview() {
        check_ajax_referer( 'aivision_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'Unauthorized' );
        wp_send_json_success( [ 'content' => AIVision_Robots::get_robots_preview() ] );
    }

    // ── AJAX: Generate Sitemap ────────────────────────────────────────────────
    public static function ajax_generate_sitemap() {
        check_ajax_referer( 'aivision_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'Unauthorized' );

        $result = AIVision_Sitemap::write_physical_sitemap();

        if ( $result['success'] ) {
            wp_send_json_success( [
                'message' => 'Sitemap XML file successfully written to root directory!',
                'url'     => $result['url'],
                'physical'=> true
            ] );
        } else {
            flush_rewrite_rules();
            wp_send_json_success( [
                'message' => 'Dynamic sitemap registered (could not write to root directory: ' . $result['error'] . ').',
                'url'     => $result['url'],
                'physical'=> false
            ] );
        }
    }

    // ── AJAX: Generate LLMs.txt ───────────────────────────────────────────────
    public static function ajax_generate_llmstxt() {
        check_ajax_referer( 'aivision_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'Unauthorized' );

        $result = AIVision_LLMsTxt::write_physical_file();

        if ( $result['success'] ) {
            wp_send_json_success( [
                'message' => 'llms.txt file successfully written to root directory!',
                'url'     => $result['url'],
                'physical'=> true
            ] );
        } else {
            flush_rewrite_rules();
            wp_send_json_success( [
                'message' => 'Dynamic llms.txt serving registered (could not write to root directory).',
                'url'     => $result['url'],
                'physical'=> false
            ] );
        }
    }

    // ── AJAX: Generate LLMs-Full.txt ──────────────────────────────────────────
    public static function ajax_generate_llmstxt_full() {
        check_ajax_referer( 'aivision_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'Unauthorized' );

        $result = AIVision_LLMsTxt::write_physical_full_file();

        if ( $result['success'] ) {
            wp_send_json_success( [
                'message' => 'llms-full.txt file successfully written to root directory!',
                'url'     => $result['url'],
                'physical'=> true
            ] );
        } else {
            flush_rewrite_rules();
            wp_send_json_success( [
                'message' => 'Dynamic llms-full.txt serving registered.',
                'url'     => $result['url'],
                'physical'=> false
            ] );
        }
    }

    // ── Content helpers ───────────────────────────────────────────────────────
    private static function geo_tips() {
        return [
            [ 'icon' => '💬', 'title' => 'Answer Directly in 40–60 Words', 'desc' => 'Place a concise definition or direct answer immediately below question headings to win Featured Snippets & AI Overviews.' ],
            [ 'icon' => '🔢', 'title' => 'Include Statistics & Specific Figures', 'desc' => 'Articles containing concrete numbers, percentages (%), and dates get cited 3.5x more often by LLMs.' ],
            [ 'icon' => '📋', 'title' => 'Add FAQPage & Article Schemas', 'desc' => 'Structured JSON-LD allows search and AI engines to parse intent, entities, and Q&A pairs instantly.' ],
            [ 'icon' => '📊', 'title' => 'Use Tables & Ordered Steps',   'desc' => 'Structured <ol> and comparison tables provide tabular facts that LLMs extract for synthesized answers.' ],
            [ 'icon' => '👤', 'title' => 'Highlight E-E-A-T & First-Person Experience', 'desc' => 'Author credentials and first-person test indicators ("in our clinical findings...") prove human authority.' ],
            [ 'icon' => '🤖', 'title' => 'Keep AI Crawlers Allowed',    'desc' => 'Ensure GPTBot, Google-Extended, and OAI-SearchBot are permitted in your robots.txt.' ],
        ];
    }
}
