/**
 * Ferdium 配方入口。
 *
 * 该服务是一个普通网页（求助端 / 出行助手），因此无需额外注入或校验逻辑。
 * 注意：Ferdium 配方只是 webview 封装，无法注册系统级全局热键，
 * 也不提供隐藏窗口或进程的能力。
 */
module.exports = Ferdium => Ferdium;
