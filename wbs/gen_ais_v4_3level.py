import csv
import importlib.util

spec = importlib.util.spec_from_file_location("gen_ais_v3_4level", "gen_ais_v3_4level.py")
v3 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v3)

ASSIGN = "Harsh,Shruti"
TIMELINE = "25-Dec-2025|07-Jun-2026"
HEADER = ["Level1_Name","Level1_Desc","Level2_Name","Level2_Desc","Level3_Name","Level3_Desc",
          "Level4_Name","Level4_Desc","Level5_Name","Level5_Desc","Assign_To","Timeline","Weight",
          "Substation_Type","Leaf_Node_Progress_Type"]

def flatten_to_3(tree):
    new_tree = []
    for l1 in tree:
        new_l2_children = []
        for l2 in l1["children"]:
            leaves = []
            for l3 in l2["children"]:
                if l3.get("children"):
                    for l4 in l3["children"]:
                        leaves.append(l4)
                else:
                    leaves.append(l3)
            new_l2_children.append({"name": l2["name"], "children": leaves})
        new_tree.append({"name": l1["name"], "children": new_l2_children})
    return new_tree

def write_csv(path, tree, sub_type):
    rows = []

    def emit(path_names, is_leaf):
        names = path_names + [""] * (5 - len(path_names))
        row = []
        for n in names:
            row.append(n)
            row.append("")
        row += [ASSIGN, TIMELINE, "", sub_type, "Binary" if is_leaf else ""]
        rows.append(row)

    def walk(node, ancestors):
        name = node["name"]
        children = node.get("children")
        path_names = ancestors + [name]
        if not children:
            emit(path_names, True)
        else:
            emit(path_names, False)
            for c in children:
                walk(c, path_names)

    for top in tree:
        walk(top, [])

    prev_names = [None] * 5
    for row in rows:
        cur_names = [row[0], row[2], row[4], row[6], row[8]]
        changed_before = False
        for i in range(5):
            if not changed_before and cur_names[i] == prev_names[i]:
                row[i * 2] = ""
            else:
                changed_before = True
        prev_names = cur_names

    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(HEADER)
        w.writerows(rows)

AIS_TREE_3LEVEL = flatten_to_3(v3.AIS_TREE_V3)

write_csv("AIS_Substation_WBS_3Level_Full.csv", AIS_TREE_3LEVEL, "AIS")
print("Done")
