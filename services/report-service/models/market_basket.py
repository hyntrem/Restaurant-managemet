import pandas as pd
from config.database import get_olap_conn
from mlxtend.frequent_patterns import apriori, association_rules


def execute_market_basket_mining():
    """
    Ứng dụng học máy tìm tổ hợp món ăn hay được gọi cùng nhau.

    FIX: Thay df.applymap() bằng df.map()
         applymap() đã bị xóa hoàn toàn trong pandas >= 2.1.0,
         dùng map() là cách chuẩn từ pandas 2.x trở đi.
    """
    conn = get_olap_conn()
    query = "SELECT order_id, menu_item_id FROM fact_order_items WHERE is_cancelled = 0"
    df = pd.read_sql(query, conn)

    if df.empty or df['order_id'].nunique() < 5:
        conn.close()
        return

    basket = (
        df.groupby(['order_id', 'menu_item_id'])['menu_item_id']
        .count()
        .unstack()
        .reset_index()
        .fillna(0)
        .set_index('order_id')
    )

    # FIX: dùng .map() thay cho .applymap() (đã bị xóa trong pandas >= 2.1)
    basket_sets = basket.map(lambda x: x >= 1)

    frequent_itemsets = apriori(basket_sets, min_support=0.01, use_colnames=True)
    if frequent_itemsets.empty:
        conn.close()
        return

    rules = association_rules(frequent_itemsets, metric="lift", min_threshold=1.0)

    # Chỉ lấy luật dạng 1 món -> 1 món (đơn giản, dễ hiểu cho quản lý nhà hàng)
    rules = rules[
        rules['antecedents'].apply(lambda x: len(x) == 1)
        & rules['consequents'].apply(lambda x: len(x) == 1)
    ]

    cursor = conn.cursor()
    insert_sql = """
        INSERT INTO agg_menu_item_pairs
            (menu_item_id_a, menu_item_id_b, co_occurrence_count,
             support_score, confidence_score, lift_score)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            co_occurrence_count = VALUES(co_occurrence_count),
            support_score       = VALUES(support_score),
            confidence_score    = VALUES(confidence_score),
            lift_score          = VALUES(lift_score),
            computed_at         = NOW()
    """
    for _, row in rules.iterrows():
        item_a   = int(list(row['antecedents'])[0])
        item_b   = int(list(row['consequents'])[0])
        co_count = int(row['support'] * len(basket))
        cursor.execute(insert_sql, (
            item_a, item_b, co_count,
            float(row['support']),
            float(row['confidence']),
            float(row['lift']),
        ))

    conn.commit()
    cursor.close()
    conn.close()