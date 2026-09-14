<?php
// Run with: php tests/wordpress-integration.test.php
define('ABSPATH', __DIR__ . '/');
define('AIVISION_VERSION', 'test');
define('AIVISION_META_KEY', '_aivision');
$options = [];
$routes = [];
class WP_Error {
    public function __construct(public $code, public $message, public $data = []) {}
}
class WP_REST_Response {
    public function __construct(public $data, public $status = 200) {}
}
class WP_REST_Request {
    public function __construct(private $params = [], private $headers = []) {}
    public function get_param($key) { return $this->params[$key] ?? null; }
    public function get_header($key) { return $this->headers[$key] ?? ''; }
}
function get_option($key, $default = []) { global $options; return $options[$key] ?? $default; }
function update_option($key, $value) { global $options; $options[$key] = $value; }
function wp_parse_args($args, $defaults) { return array_merge($defaults, $args); }
function is_wp_error($value) { return $value instanceof WP_Error; }
function register_rest_route($namespace, $route, $config) { global $routes; $routes[$route] = $config; }
function sanitize_text_field($value) { return trim((string)$value); }
function esc_url_raw($value) { return $value; }
function wp_generate_password($length, $special) { return str_repeat('x', $length); }
function current_time($format) { return '2026-09-13 12:00:00'; }
function get_bloginfo($key) { return 'Test site'; }
function home_url() { return 'https://example.test'; }
function maybe_unserialize($value) { return $value; }
function get_permalink($id) { return 'https://example.test/' . $id; }
function get_post($id) {
    return (object)['ID' => $id, 'post_status' => 'publish', 'post_title' => 'Test', 'post_modified' => '2026-09-13'];
}
class AIVision_Analyzer {
    public static function seo_score($id, $meta) { return ['score' => 95]; }
    public static function aeo_score($id, $meta) { return ['score' => 71]; }
    public static function geo_score($id, $meta) { return ['score' => 84]; }
}
$wpdb = new class {
    public $postmeta = 'postmeta';
    public $posts = 'posts';
    public $rows = [];
    public function prepare($query, $key) { return $query; }
    public function get_results($query) { return $this->rows; }
};
function check($condition, $message) {
    if (!$condition) throw new RuntimeException($message);
    echo "PASS: " . $message . PHP_EOL;
}
require __DIR__ . '/../plugins/aivision-seo/includes/class-integration.php';
AIVisibility_Integration::register_rest_routes();
check($routes['/verify']['permission_callback'] === [AIVisibility_Integration::class, 'check_rest_permission'], 'Handshake requires saved credentials');
$attack = new WP_REST_Request(['api_key' => 'attacker']);
check(is_wp_error(AIVisibility_Integration::rest_verify_connection($attack)), 'Unpaired sites reject public setup');
check(count($options) === 0, 'Rejected setup does not write settings');
$options[AIVisibility_Integration::OPTION_KEY] = ['api_key' => 'trusted', 'site_token' => 'old-token'];
$before = $options;
check(is_wp_error(AIVisibility_Integration::rest_verify_connection($attack)), 'Existing connection rejects attacker key');
check($options === $before, 'Takeover attempt preserves existing settings');
$rotation = new WP_REST_Request(['api_key' => 'attacker'], ['authorization' => 'Bearer trusted']);
check(is_wp_error(AIVisibility_Integration::rest_verify_connection($rotation)), 'Remote handshake cannot rotate saved key');
$valid = new WP_REST_Request(['api_key' => 'trusted', 'business_id' => 'mine'], ['authorization' => 'Bearer trusted']);
check(AIVisibility_Integration::rest_verify_connection($valid)->status === 200, 'Preconfigured key can verify connection');
$malformed = new WP_REST_Request(['api_key' => ['invalid']]);
check(is_wp_error(AIVisibility_Integration::check_rest_permission($malformed)), 'Malformed tokens are rejected without type errors');
$wpdb->rows = [(object)['post_id' => 1, 'meta_value' => []]];
$result = AIVisibility_Integration::rest_get_telemetry(new WP_REST_Request());
check($result->data['summary']['average_seo'] == 95, 'Telemetry uses SEO analyzer');
check($result->data['summary']['average_aeo'] == 71, 'Telemetry uses AEO analyzer');
check($result->data['summary']['average_geo'] == 84, 'Telemetry uses GEO analyzer');
check($result->data['summary']['count'] === 1, 'Summary count matches exported posts');
$wpdb->rows = [];
$result = AIVisibility_Integration::rest_get_telemetry(new WP_REST_Request());
check($result->data['summary']['count'] === 0, 'Empty telemetry succeeds without division by zero');
