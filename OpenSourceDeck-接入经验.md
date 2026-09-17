# OpenSourceDeck 接入经验总结

> 本文档沉淀从「克隆 → 调研真正维护的项目 → 连 GitHub 取真实 PR → 启动服务」全过程的关键认知与坑，供后续快速参考。

## 1. 真正维护的项目是哪个

- **上游 / 维护方 = `ranxi2001/opensource-deck`**（有 `v0.1.0` / `v0.1.1` 标签，近期活跃提交，最新 `main = bcad879`）。
- 本地从 gitee `buleboy8065/opensource-deck` 克隆而来，其基底 `bcad879` **正好等于上游最新 `main`**，所以代码本身不旧——之前误以为"旧"是错觉。
- 上游**当前 0 个开放 PR**（`git ls-remote` 看不到任何 `refs/pull/*`）；分支 `fix/exclude-closed-contribution-issues` 与 `main` 同点（`bcad879`），无任何独有提交，是空分支。
- 想看"维护项目的 PR/动态"，在应用账户面板输入 `ranxi2001` 即可（见第 2 节）。

## 2. "连 GitHub 取真实 PR"的真相（最关键）

**默认 `npm run dev` 跑的是仓库内置的「样例数据」，根本没连 GitHub。** 要拿到真实数据只有两条路：

| 方式 | 做法 | 限制 |
| --- | --- | --- |
| **① 账户面板输用户名（推荐）** | 打开应用 → 账户面板输入 `cyberspace-cs`（或 `ranxi2001`） | 由**用户浏览器**直接请求 `api.github.com`，只读；**不受本沙箱网络/配额限制**，最稳 |
| **② 烘焙 live 快照** | `GITHUB_TOKEN=<PAT> npm run sync -- --user <login> --output public/data/live.json`，再 `VITE_DATA_FILE=data/live.json npm run dev` | 需要 GitHub **PAT**；快照默认加载真实数据 |

- `sync` 脚本：`token = process.env.GITHUB_TOKEN`（非 CI 可缺省走匿名），目标用户由 `--user <login>` 或 `deck.config.yml` 的 `github_user` 指定；采集逻辑在 `scripts/lib/collector.ts`（按 `author:${user} is:pr` 等条件检索）。
- 应用是**只读**的，绝不修改上游 GitHub 状态（见 README「产品原则」）。

## 3. 认证相关的坑（最容易踩）

- 本机 SSH 公钥 `~/.ssh/id_ed25519.pub` **已绑定 GitHub 账号 `cyberspace-cs`** → `ssh -T git@github.com` 返回 `Hi cyberspace-cs!`。因此 **git 传输（clone / push）免密**，但 **SSH 密钥不能当 REST API token 用**。
- GitHub REST API（`api.github.com`）**必须 PAT**（`GITHUB_TOKEN` / `GH_TOKEN`）；本机**未安装 `gh` CLI**。
- **沙箱GitHub 配额陷阱**：沙箱能直连 `api.github.com`（实测 `HTTP 200` 取回 `cyberspace-cs` 账户），但**匿名仅 60 次/小时**。一次 `sync` 多调用即耗尽，实测跑到取用户资料时拿到 `403`（`x-ratelimit-remaining: 0`）。所以要**烘焙完整 live 快照，必须让用户提供只读 PAT**（Settings → Developer settings → PAT，勾 `read:org` / `public_repo` 足够）。
- 浏览器侧的「账户面板输用户名」走的是用户自己机器的网络与配额，与沙箱无关，因此最推荐。

## 4. 远端结构（三远端）

本地仓库 `/data/usershare/project/TxBuddy/opensource-deck`：

| 名称 | 地址 | 用途 |
| --- | --- | --- |
| `origin` | `https://gitee.com/buleboy8065/opensource-deck.git`（fetch）/ `git@gitee.com:buleboy8065/opensource-deck.git`（push） | Gitee 镜像，已推指南 `2690bcf` |
| `github` | `git@github.com:cyberspace-cs/opensource-deck.git` | 用户自己的 GitHub，已推 `2690bcf` |
| `upstream` | `git@github.com:ranxi2001/opensource-deck.git` | 真正维护的项目，用于同步最新 |

> 为何 gitee 的 push 用 SSH：克隆是 https 且无 credential helper，但本账户 SSH 已验证可达，故 `git remote set-url --push origin git@gitee.com:buleboy8065/opensource-deck.git` 实现免交互推送。

## 5. 启动 / 预览

- 环境：要求 Node ≥ 24，用 conda `llm` 环境 `/home/user/miniconda3/envs/llm/bin/node`（v26.5.0）。
- 启动：`export PATH=/home/user/miniconda3/envs/llm/bin:$PATH && npm run dev -- --port 5173 --host 127.0.0.1`。
- 工具会把 vite 识别为常驻服务托管，`preview_url http://localhost:5173` 即可在 IDE 内置浏览器打开。
- 若需真实数据：打开后到账户面板输入 `cyberspace-cs`（看自己）或 `ranxi2001`（看维护项目）。

## 6. 一句话结论

> 之前看到的是**样例数据**，不是你的 GitHub。要让工作台显示真实 PR：在浏览器里输你的用户名即可；要把"一开就是真实数据"固化下来，给我一个只读 PAT，我跑 `sync` 烘焙 `live.json` 并重启服务。
