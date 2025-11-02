

1. 父应用的传参方法：
`coverSegmentFromLLM` 父应用存在的方法
```json
{
  "data_list": [
    {
      "frequency_range": [0.1, 1.0],
      "name": "Item A",
      "uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
     "dataGroup": ""
    },
    {
      "frequency_range": [10.5, 20.0],
      "name": "Item B",
      "uuid": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
"dataGroup": ""
    },
    {
      "frequency_range": [100.0, 150.0],
      "name": "Item C",
      "uuid": "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz",
"dataGroup": ""
    }
  ]
}
```

需要确定，什么是“传参按照我的方法传”

2. 接口文档：
### 生产环境基路径
https://huihifi.com/api

---

### api请求前需要进行签名校验合法身份，且防止数据被篡改，故在请求上需要携带签名值及其他辅助字段。

#### 一、如何签名？

1. 线下与管理员获取 ``appKey`` 与 ``secretKey``
2. 生成：当前时间戳 ``timestamp``（注意：只有**5分钟**有效期，和北京时间不能差别太大）
3. 将 ``appKey`` 、 ``timestamp`` 拼接起来做盐，对 ``secretKey`` 进行 **sha256** 加签运算，以 **base64** 释出得到 ``sign``
4. 将 ``appKey`` 、 ``timestamp`` 、 ``sign`` 放置请求头header

#### 二、举例：
校验用户登录token
1. 完整接口地址：[https://huihifi.com/api/v1/openapi/login-check(https://huihifi.com/api/v1/openapi/login-check)
2. 获取到 ``appKey`` 为 *ABCD* ， ``secretKey`` 为 *EFGH*
3. 生成时间戳 ``timestamp`` 为 *1649566908768*
4.  将 ``appKey`` 、 ``timestamp`` 拼接起来得到 *ABCD1649566908768* 做盐，对 ``secretKey`` *EFGH* 进行 **sha256** 加签运算，以 **base64** 释出得到 ``sign`` *PCVh2u2A/+ewBOwR0VIx3rklhQAEa2/CxpnWf4vPmQI=*
5. 将 
``appKey`` *ABCD*
``timestamp`` *1649566908768*
``sign`` *PCVh2u2A/+ewBOwR0VIx3rklhQAEa2/CxpnWf4vPmQI=* 
放置请求头header进行请求得到结果
```json
{
	"code": 0,
	"desc": "success",
	"data": {
		"uuid": "b34eb750-9504-44dd-9e22-89d9b1b04fd1",
		"name": "测试1",
                "email": "ceshi@qq.com"
	}
}
```

# 登录校验

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /v1/openapi/users/login-check:
    post:
      summary: 登录校验
      deprecated: false
      description: ''
      operationId: UserV1OpenapiController_loginCheck
      tags:
        - 用户
        - User_openapi
      parameters: []
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UserOpenApiLoginCheckDto'
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserOpenApiLoginCheckResult'
          headers: {}
          x-apifox-name: 成功
      security: []
      x-apifox-folder: 用户
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/7240502/apis/api-361660286-run
components:
  schemas:
    UserOpenApiLoginCheckDto:
      type: object
      properties:
        token:
          type: string
      required:
        - token
      x-apifox-orders:
        - token
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    UserOpenApiLoginCheckResult:
      type: object
      properties:
        uuid:
          type: string
          description: uuid
        name:
          type: string
          description: 用户名
        mobile:
          type: string
          description: 手机号
        title:
          type: string
          description: 头衔
        userType:
          type: string
          description: 用户类型
        avatar:
          type: string
          description: 用户类型
        titleCertification:
          type: string
          description: 用户类型
        signature:
          type: string
          description: 签名
        createTime:
          type: number
          description: 注册时间
      required:
        - uuid
        - name
        - mobile
        - title
        - userType
        - avatar
        - titleCertification
        - signature
        - createTime
      x-apifox-orders:
        - uuid
        - name
        - mobile
        - title
        - userType
        - avatar
        - titleCertification
        - signature
        - createTime
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
  securitySchemes:
    token:
      type: apikey
      name: token
      in: header
servers: []
security: []

```

# 列表

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /v1/openapi/evaluations:
    post:
      summary: 列表
      deprecated: false
      description: ''
      operationId: EvaluationV1OpenapiController_index
      tags:
        - 评测产品
        - Evaluation_openapi
      parameters: []
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/EvaluationOpenApiIndexDto'
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                properties:
                  total:
                    type: number
                  list:
                    type: array
                    items:
                      $ref: '#/components/schemas/EvaluationOpenapiIndexResult'
                required:
                  - total
                  - list
                x-apifox-orders:
                  - total
                  - list
                type: object
                x-apifox-ignore-properties: []
          headers: {}
          x-apifox-name: 成功
      security: []
      x-apifox-folder: 评测产品
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/7240502/apis/api-361660287-run
components:
  schemas:
    EvaluationOpenApiIndexDto:
      type: object
      properties:
        orderBy:
          type: string
          description: 排序字段
          examples:
            - createTime
        direction:
          type: string
          description: 排序方向
          examples:
            - DESC
        lastKey:
          type: string
          description: 上一页最后一条数据的排序字段值
          examples:
            - '2025-01-01 00:00:00'
        lastId:
          type: string
          description: 上一页最后一条数据的id
          examples:
            - '1'
        pageSize:
          type: number
          description: 分页数量，不传为20,最大100
          default: 20
        keyword:
          type: string
          description: 关键词，模糊搜品牌、标题，忽略大小写
          examples:
            - 索尼
        category:
          type: string
          description: 分类，是耳机还是播放器
          examples:
            - EARBUDS
        specifications:
          description: 规格参数
          type: array
          items:
            $ref: '#/components/schemas/EvaluationIndexDtoSpecificationItem'
          examples:
            - >-
              [{"specificationUuid":"280c0b2f-80b5-4720-843a-adce2d2242dd","value":["1000","1001"]}]
        brandUuids:
          description: 品牌uuid
          type: array
          items:
            type: string
          examples:
            - - 280c0b2f-80b5-4720-843a-adce2d2242dd
              - bec9a9a5-f2ed-4654-993d-b383c8e8756e
        prices:
          type: array
          description: 价格区间，多个区间查询，null为不限
          items:
            type: array
            items:
              oneOf:
                - type: number
                - type: 'null'
          examples:
            - - - null
                - 800
              - - 1000
                - 1001
        uuids:
          description: 多个uuid精准查询
          type: array
          items:
            type: string
          examples:
            - - 280c0b2f-80b5-4720-843a-adce2d2242dd
              - bec9a9a5-f2ed-4654-993d-b383c8e8756e
      required:
        - orderBy
        - direction
      x-apifox-orders:
        - orderBy
        - direction
        - lastKey
        - lastId
        - pageSize
        - keyword
        - category
        - specifications
        - brandUuids
        - prices
        - uuids
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    EvaluationIndexDtoSpecificationItem:
      type: object
      properties:
        specificationUuid:
          type: string
        value:
          type: array
          items:
            type: string
      required:
        - specificationUuid
        - value
      x-apifox-orders:
        - specificationUuid
        - value
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    EvaluationOpenapiIndexResult:
      type: object
      properties:
        uuid:
          type: string
          description: uuid
        id:
          type: number
          description: uuid
        title:
          type: string
        category:
          type: string
        dataGroups:
          type: array
          items:
            type: string
        article:
          $ref: '#/components/schemas/EvaluationIndexResultArticle'
        specifications:
          type: array
          items:
            $ref: '#/components/schemas/EvaluationIndexResultSpecification'
        brand:
          $ref: '#/components/schemas/EvaluationIndexResultBrand'
        price:
          type: number
        buyUrl:
          type: string
      required:
        - uuid
        - id
        - title
        - category
        - dataGroups
        - article
        - specifications
        - brand
        - buyUrl
      x-apifox-orders:
        - uuid
        - id
        - title
        - category
        - dataGroups
        - article
        - specifications
        - brand
        - price
        - buyUrl
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    EvaluationIndexResultBrand:
      type: object
      properties:
        title:
          type: string
        img:
          type: string
      required:
        - title
        - img
      x-apifox-orders:
        - title
        - img
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    EvaluationIndexResultSpecification:
      type: object
      properties:
        uuid:
          type: string
          description: uuid
        value:
          type: string
        specificationUuid:
          type: string
      required:
        - uuid
        - value
        - specificationUuid
      x-apifox-orders:
        - uuid
        - value
        - specificationUuid
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    EvaluationIndexResultArticle:
      type: object
      properties:
        desc:
          type: string
        keywords:
          type: array
          items:
            type: string
        publishTime:
          type: number
        thumbnails:
          type: array
          items:
            type: string
      required:
        - desc
        - keywords
        - publishTime
        - thumbnails
      x-apifox-orders:
        - desc
        - keywords
        - publishTime
        - thumbnails
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
  securitySchemes:
    token:
      type: apikey
      name: token
      in: header
servers: []
security: []

```
   